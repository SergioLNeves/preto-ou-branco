package main

import (
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"preto-ou-branco/internal/spa"
)

func main() {
	staticFS, err := spa.Assets()
	if err != nil {
		log.Fatalf("%v", err)
	}
	app := NewApp(staticFS)

	err = wails.Run(&options.App{
		Title:  "Preto ou Branco",
		Width:  480,
		Height: 850,
		AssetServer: &assetserver.Options{
			Assets: staticFS,
		},
		BackgroundColour: &options.RGBA{R: 10, G: 10, B: 10, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app.authApp,
			app.serverApp,
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
