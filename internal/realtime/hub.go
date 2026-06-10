package realtime

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

type Client struct {
	hub           *Hub
	conn          *websocket.Conn
	send          chan []byte
	RoomID        string
	ParticipantID string
}

type Hub struct {
	mu      sync.RWMutex
	rooms   map[string]map[*Client]struct{}
	reg     chan *Client
	unreg   chan *Client
	done    chan struct{}
}

func NewHub() *Hub {
	h := &Hub{
		rooms: make(map[string]map[*Client]struct{}),
		reg:   make(chan *Client, 64),
		unreg: make(chan *Client, 64),
		done:  make(chan struct{}),
	}
	go h.run()
	return h
}

func (h *Hub) run() {
	for {
		select {
		case c := <-h.reg:
			h.mu.Lock()
			if h.rooms[c.RoomID] == nil {
				h.rooms[c.RoomID] = make(map[*Client]struct{})
			}
			h.rooms[c.RoomID][c] = struct{}{}
			h.mu.Unlock()
		case c := <-h.unreg:
			h.mu.Lock()
			if clients, ok := h.rooms[c.RoomID]; ok {
				delete(clients, c)
				if len(clients) == 0 {
					delete(h.rooms, c.RoomID)
				}
			}
			h.mu.Unlock()
			close(c.send)
		case <-h.done:
			return
		}
	}
}

func (h *Hub) Register(c *Client)   { h.reg <- c }
func (h *Hub) Unregister(c *Client) { h.unreg <- c }

func (h *Hub) Broadcast(roomID string, event any) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	h.mu.RLock()
	clients := h.rooms[roomID]
	h.mu.RUnlock()
	for c := range clients {
		select {
		case c.send <- data:
		default:
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.Unregister(c)
		c.conn.Close()
	}()
	c.conn.SetReadLimit(512)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("ws error: %v", err)
			}
			return
		}
	}
}

func NewClient(hub *Hub, conn *websocket.Conn, roomID, participantID string) *Client {
	return &Client{hub: hub, conn: conn, send: make(chan []byte, 256), RoomID: roomID, ParticipantID: participantID}
}
