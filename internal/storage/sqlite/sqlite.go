package sqlite

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var seedNamespace = uuid.MustParse("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

func seedID(slug string) string {
	return uuid.NewSHA1(seedNamespace, []byte(slug)).String()
}

func DBPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("user config dir: %w", err)
	}
	return filepath.Join(dir, "preto-ou-branco", "app.db"), nil
}

func Open() (*gorm.DB, error) {
	dbPath, err := DBPath()
	if err != nil {
		return nil, err
	}
	return OpenAt(dbPath)
}

// OpenAt opens (or creates) the database at an explicit path.
// Used by the mobile build where the Android app provides the files directory.
func OpenAt(dbPath string) (*gorm.DB, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, fmt.Errorf("create db directory: %w", err)
	}

	db, err := gorm.Open(
		sqlite.Open(dbPath+"?_pragma=foreign_keys(1)"),
		&gorm.Config{
			Logger:      logger.Default.LogMode(logger.Silent),
			NowFunc:     func() time.Time { return time.Now().UTC() },
			PrepareStmt: true,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	if err := db.AutoMigrate(GetModelsToMigrate()...); err != nil {
		return nil, fmt.Errorf("auto migrate: %w", err)
	}

	if err := seedGameData(db); err != nil {
		return nil, fmt.Errorf("seed: %w", err)
	}

	gcExpiredSessions(db)

	return db, nil
}

// gcExpiredSessions removes expired sessions on startup so the user_session
// table doesn't grow unbounded over the app's lifetime. Best-effort: a
// failure here shouldn't block startup.
func gcExpiredSessions(db *gorm.DB) {
	db.Where("expires_at < ?", time.Now().UTC()).Delete(&UserSessionTable{})
}

type seedQuestion struct {
	slug         string
	categorySlug string
	text         string
}

func seedGameData(db *gorm.DB) error {
	type catSeed struct {
		slug  string
		name  string
		emoji string
	}
	catSeeds := []catSeed{
		{"esportes", "Esportes", "⚽"},
		{"musica", "Música", "🎵"},
		{"comportamento", "Comportamento", "🧠"},
		{"gastronomia", "Gastronomia", "🍽"},
		{"aventura", "Aventura", "🪂"},
		{"moda", "Moda", "👗"},
	}

	categoryIDs := make(map[string]string)
	for _, c := range catSeeds {
		id := seedID("category:" + c.slug)
		var existing CategoryTable
		if err := db.Where("id = ?", id).First(&existing).Error; err != nil {
			row := CategoryTable{ID: id, Slug: c.slug, Name: c.name, Emoji: c.emoji}
			if err2 := db.Create(&row).Error; err2 != nil {
				return fmt.Errorf("seed category %s: %w", c.slug, err2)
			}
		}
		categoryIDs[c.slug] = id
	}

	questions := []seedQuestion{
		// Esportes
		{"esp-01", "esportes", "Jogar bola descalço na rua"},
		{"esp-02", "esportes", "Treinar às 5 da manhã todo dia"},
		{"esp-03", "esportes", "Praticar capoeira"},
		{"esp-04", "esportes", "Nadar em clube fechado"},
		{"esp-05", "esportes", "Jogar tênis no clube"},
		{"esp-06", "esportes", "Surfar de manhã cedo"},
		{"esp-07", "esportes", "Praticar hipismo"},
		{"esp-08", "esportes", "Jogar basquete na quadra da rua"},
		{"esp-09", "esportes", "Jogar golfe no final de semana"},
		{"esp-10", "esportes", "Praticar MMA"},
		{"esp-11", "esportes", "Jogar vôlei de praia"},
		{"esp-12", "esportes", "Andar de skate na praça"},
		{"esp-13", "esportes", "Pedalar pelo bairro todo dia"},
		{"esp-14", "esportes", "Lutar capoeira angola"},
		{"esp-15", "esportes", "Correr na rua de madrugada"},
		{"esp-16", "esportes", "Jogar sinuca no bar"},
		{"esp-17", "esportes", "Fazer escalada em rocha"},
		{"esp-18", "esportes", "Praticar canoagem"},
		{"esp-19", "esportes", "Assistir corrida de cavalo"},
		{"esp-20", "esportes", "Treinar boxe na academia"},
		{"esp-21", "esportes", "Jogar ping-pong no trabalho"},
		{"esp-22", "esportes", "Praticar polo aquático"},
		{"esp-23", "esportes", "Jogar futevôlei na praia"},
		{"esp-24", "esportes", "Assistir futebol americano"},
		{"esp-25", "esportes", "Jogar beisebol"},
		{"esp-26", "esportes", "Fazer corrida de rua nos fins de semana"},
		{"esp-27", "esportes", "Jogar handebol na escola"},
		{"esp-28", "esportes", "Meditar antes do treino"},
		{"esp-29", "esportes", "Praticar remo em clube"},
		{"esp-30", "esportes", "Praticar esgrima"},
		// Música
		{"mus-01", "musica", "Curtir samba no boteco"},
		{"mus-02", "musica", "Tocar piano clássico"},
		{"mus-03", "musica", "Colocar funk no volume máximo"},
		{"mus-04", "musica", "Ouvir heavy metal"},
		{"mus-05", "musica", "Curtir forró pé de serra"},
		{"mus-06", "musica", "Ouvir jazz no apartamento"},
		{"mus-07", "musica", "Rimar no freestyle"},
		{"mus-08", "musica", "Tocar atabaque no candomblé"},
		{"mus-09", "musica", "Tocar violino na orquestra"},
		{"mus-10", "musica", "Curtir pagode no domingo"},
		{"mus-11", "musica", "Ouvir sertanejo universitário"},
		{"mus-12", "musica", "Cantar MPB na voz e violão"},
		{"mus-13", "musica", "Ouvir bossa nova no vinil"},
		{"mus-14", "musica", "Ir ao baile funk"},
		{"mus-15", "musica", "Curtir axé no carnaval"},
		{"mus-16", "musica", "Ouvir música eletrônica"},
		{"mus-17", "musica", "Tocar tambor de crioula"},
		{"mus-18", "musica", "Cantar rap nacional"},
		{"mus-19", "musica", "Ouvir ópera"},
		{"mus-20", "musica", "Curtir reggae"},
		{"mus-21", "musica", "Ouvir maracatu"},
		{"mus-22", "musica", "Estudar teoria musical clássica"},
		{"mus-23", "musica", "Ouvir trap brasileiro"},
		{"mus-24", "musica", "Participar de toque de candomblé"},
		{"mus-25", "musica", "Cantar samba-reggae"},
		{"mus-26", "musica", "Ir a show de rock nacional"},
		{"mus-27", "musica", "Participar de roda de samba"},
		{"mus-28", "musica", "Curtir pagode baiano"},
		{"mus-29", "musica", "Fazer beatbox na rua"},
		{"mus-30", "musica", "Ouvir chorinho"},
		// Comportamento
		{"com-01", "comportamento", "Chegar atrasado na festa"},
		{"com-02", "comportamento", "Abraçar desconhecido na festa"},
		{"com-03", "comportamento", "Tomar vinho às 3 da tarde"},
		{"com-04", "comportamento", "Falar alto no celular em público"},
		{"com-05", "comportamento", "Dançar no meio da rua"},
		{"com-06", "comportamento", "Calcular o centavo na conta"},
		{"com-07", "comportamento", "Dar oi pro porteiro todo dia"},
		{"com-08", "comportamento", "Usar protetor solar só no verão"},
		{"com-09", "comportamento", "Compartilhar o prato no restaurante"},
		{"com-10", "comportamento", "Rezar antes de comer"},
		{"com-11", "comportamento", "Ligar a TV assim que chega em casa"},
		{"com-12", "comportamento", "Dormir depois do almoço"},
		{"com-13", "comportamento", "Ignorar sinal vermelho de madrugada"},
		{"com-14", "comportamento", "Improvisar festa de última hora"},
		{"com-15", "comportamento", "Cantar no banho em voz alta"},
		{"com-16", "comportamento", "Ajudar desconhecido com carro parado"},
		{"com-17", "comportamento", "Salvar lugar na fila com objeto"},
		{"com-18", "comportamento", "Jogar videogame a noite toda"},
		{"com-19", "comportamento", "Brincar de pega-pega na rua adulto"},
		{"com-20", "comportamento", "Tomar banho frio todo dia"},
		{"com-21", "comportamento", "Dividir apostila xerocada"},
		{"com-22", "comportamento", "Receber visita sem avisar"},
		{"com-23", "comportamento", "Pagar boleto no dia do vencimento"},
		{"com-24", "comportamento", "Guardar segredo de todo mundo"},
		{"com-25", "comportamento", "Dar presente embrulhado em sacola"},
		{"com-26", "comportamento", "Improvisar receita com o que tem"},
		{"com-27", "comportamento", "Combinar na última hora"},
		{"com-28", "comportamento", "Ceder o assento no ônibus"},
		{"com-29", "comportamento", "Consertar coisa quebrada com fita"},
		{"com-30", "comportamento", "Limpar a casa no sábado de manhã"},
		// Gastronomia
		{"gas-01", "gastronomia", "Comer feijoada no sábado"},
		{"gas-02", "gastronomia", "Almoçar japonês todo dia útil"},
		{"gas-03", "gastronomia", "Comer acarajé na feira"},
		{"gas-04", "gastronomia", "Tomar cafezinho depois do almoço"},
		{"gas-05", "gastronomia", "Colocar pimenta em tudo"},
		{"gas-06", "gastronomia", "Tomar champanhe no café da manhã"},
		{"gas-07", "gastronomia", "Comer vatapá com caruru"},
		{"gas-08", "gastronomia", "Tomar água de coco na praia"},
		{"gas-09", "gastronomia", "Comer baião de dois"},
		{"gas-10", "gastronomia", "Comer chocolate amargo 80%"},
		{"gas-11", "gastronomia", "Comer buchada de bode"},
		{"gas-12", "gastronomia", "Tomar suco de caju natural"},
		{"gas-13", "gastronomia", "Tomar chá verde por escolha"},
		{"gas-14", "gastronomia", "Comer tapioca no café da manhã"},
		{"gas-15", "gastronomia", "Tomar cachaça no copo americano"},
		{"gas-16", "gastronomia", "Tomar vinho importado no jantar"},
		{"gas-17", "gastronomia", "Comer caruru"},
		{"gas-18", "gastronomia", "Comer munguzá no tabuleiro"},
		{"gas-19", "gastronomia", "Comer pirão com peixe"},
		{"gas-20", "gastronomia", "Tomar refrigerante na lata no almoço"},
		{"gas-21", "gastronomia", "Comer xinxim de galinha"},
		{"gas-22", "gastronomia", "Tomar vitamina de abacate"},
		{"gas-23", "gastronomia", "Comer paçoca com café"},
		{"gas-24", "gastronomia", "Tomar batida de maracujá"},
		{"gas-25", "gastronomia", "Comer canjica com canela"},
		{"gas-26", "gastronomia", "Comer acarajé sem camarão"},
		{"gas-27", "gastronomia", "Comer carne seca na panela de pressão"},
		{"gas-28", "gastronomia", "Tomar açaí com granola"},
		{"gas-29", "gastronomia", "Comer umbu com mel"},
		{"gas-30", "gastronomia", "Tomar chá de ervas do quintal"},
		// Aventura
		{"aven-01", "aventura", "Surfar ondas grandes"},
		{"aven-02", "aventura", "Pular de paraquedas"},
		{"aven-03", "aventura", "Acampar sem celular por uma semana"},
		{"aven-04", "aventura", "Escalar morro sem equipamento"},
		{"aven-05", "aventura", "Andar de moto pela estrada"},
		{"aven-06", "aventura", "Fazer desce-rio"},
		{"aven-07", "aventura", "Viajar de mochila para o Nordeste"},
		{"aven-08", "aventura", "Nadar em rio com correnteza"},
		{"aven-09", "aventura", "Dormir na praia a céu aberto"},
		{"aven-10", "aventura", "Pegar carona com desconhecido"},
		{"aven-11", "aventura", "Mergulhar em alto mar"},
		{"aven-12", "aventura", "Fazer camping selvagem no mato"},
		{"aven-13", "aventura", "Atravessar a cidade de bicicleta"},
		{"aven-14", "aventura", "Pescar em alto mar desde cedo"},
		{"aven-15", "aventura", "Voar de asa delta"},
		{"aven-16", "aventura", "Andar de buggy na duna"},
		{"aven-17", "aventura", "Fazer bóia-cross em cachoeira"},
		{"aven-18", "aventura", "Subir em árvore de adulto"},
		{"aven-19", "aventura", "Jogar futebol na chuva pesada"},
		{"aven-20", "aventura", "Atravessar cachoeira com correnteza"},
		{"aven-21", "aventura", "Andar a cavalo na beira da praia"},
		{"aven-22", "aventura", "Ficar sem celular por 15 dias"},
		{"aven-23", "aventura", "Pegar onda gigante sem prancha"},
		{"aven-24", "aventura", "Correr na rua de madrugada"},
		{"aven-25", "aventura", "Viajar de van com desconhecidos"},
		{"aven-26", "aventura", "Subir favela a pé pela primeira vez"},
		{"aven-27", "aventura", "Fazer rapel em cachoeira"},
		{"aven-28", "aventura", "Jogar bola descalço na areia molhada"},
		{"aven-29", "aventura", "Acordar antes do sol para pescar"},
		{"aven-30", "aventura", "Explorar cidade nova sem mapa"},
		// Moda
		{"mod-01", "moda", "Usar turbante no dia a dia"},
		{"mod-02", "moda", "Usar terno em casamento"},
		{"mod-03", "moda", "Usar camiseta de time todo dia"},
		{"mod-04", "moda", "Usar blazer no calor"},
		{"mod-05", "moda", "Usar chinelo com meia"},
		{"mod-06", "moda", "Usar muitos acessórios dourados"},
		{"mod-07", "moda", "Usar bermuda de tecido"},
		{"mod-08", "moda", "Usar havaiana sem meia"},
		{"mod-09", "moda", "Usar dreads"},
		{"mod-10", "moda", "Usar gravata borboleta"},
		{"mod-11", "moda", "Usar roupas coloridas no dia a dia"},
		{"mod-12", "moda", "Usar tudo preto sempre"},
		{"mod-13", "moda", "Usar sapatênis no trabalho"},
		{"mod-14", "moda", "Usar calça rasgada no joelho"},
		{"mod-15", "moda", "Usar coroa de flores no cabelo"},
		{"mod-16", "moda", "Usar óculos de armação exagerada"},
		{"mod-17", "moda", "Usar tranças boxeadoras"},
		{"mod-18", "moda", "Usar mocassim no casual"},
		{"mod-19", "moda", "Usar camiseta regata no calor"},
		{"mod-20", "moda", "Usar colete social"},
		{"mod-21", "moda", "Usar rasteirinha colorida"},
		{"mod-22", "moda", "Usar suéter de gola alta"},
		{"mod-23", "moda", "Usar blusão de moletom oversized"},
		{"mod-24", "moda", "Usar bolsa de couro de marca"},
		{"mod-25", "moda", "Usar top de crochê artesanal"},
		{"mod-26", "moda", "Usar chapéu de palha"},
		{"mod-27", "moda", "Usar conjunto de helanca colorido"},
		{"mod-28", "moda", "Usar tênis de couro"},
		{"mod-29", "moda", "Usar guias de candomblé"},
		{"mod-30", "moda", "Usar cartola no dia a dia"},
	}

	for _, q := range questions {
		id := seedID("question:" + q.slug)
		var existing QuestionTable
		if err := db.Where("id = ?", id).First(&existing).Error; err != nil {
			row := QuestionTable{
				ID:         id,
				CategoryID: categoryIDs[q.categorySlug],
				Text:       q.text,
			}
			if err2 := db.Create(&row).Error; err2 != nil {
				return fmt.Errorf("seed question %s: %w", q.slug, err2)
			}
		}
	}
	return nil
}
