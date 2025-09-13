package main

import (
	"runtime"

	"github.com/gofiber/fiber/v2"
	"github.com/tiredkangaroo/system/linux"
	"github.com/tiredkangaroo/system/system"
)

func main() {
	var sys system.System
	switch runtime.GOOS {
	case "linux":
		sys = &linux.LinuxSystem{}
	default:
		panic("Unsupported OS")
	}

	app := fiber.New()

	api := app.Group("/api/v1")
	api.Get("/system_info", func(c *fiber.Ctx) error {
		info, err := sys.GetSystemInfo()
		if err != nil {
			return c.JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.JSON(info)
	})

	app.Listen(":9000")
}
