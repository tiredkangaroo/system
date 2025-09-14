package main

import (
	"log/slog"
	"runtime"
	"syscall"

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
	api.Get("/info", func(c *fiber.Ctx) error {
		info, err := sys.GetSystemInfo()
		if err != nil {
			return c.JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.JSON(info)
	})
	api.Post("/kill/:pid", func(c *fiber.Ctx) error {
		pid, err := c.ParamsInt("pid")
		if err != nil {
			return c.JSON(fiber.Map{
				"error": "invalid PID",
			})
		}
		if err := syscall.Kill(pid, syscall.SIGKILL); err != nil {
			return c.JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.JSON(fiber.Map{
			"error": nil,
		})
	})
	api.Post("/terminate/:pid", func(c *fiber.Ctx) error {
		pid, err := c.ParamsInt("pid")
		if err != nil {
			return c.JSON(fiber.Map{
				"error": "invalid PID",
			})
		}
		if err := syscall.Kill(pid, syscall.SIGTERM); err != nil {
			return c.JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.JSON(fiber.Map{
			"error": nil,
		})
	})

	if err := app.Listen(":9100"); err != nil {
		slog.Error("server", "error", err)
	}
}
