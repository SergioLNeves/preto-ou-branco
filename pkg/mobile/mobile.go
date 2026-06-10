package mobile

import internalmobile "preto-ou-branco/internal/mobile"

func StartServer(dbPath string, port int) error {
	return internalmobile.StartServer(dbPath, port)
}

func StopServer() error {
	return internalmobile.StopServer()
}

func StartTunnel(cloudflaredPath string) (string, error) {
	return internalmobile.StartTunnel(cloudflaredPath)
}

func StopTunnel() error {
	return internalmobile.StopTunnel()
}

func GetServerStatus() string {
	return internalmobile.GetServerStatus()
}
