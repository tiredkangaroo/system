package main

import (
	"io"
	"log/slog"
	"runtime"
	"slices"
	"syscall"
	"time"

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

	infoService := system.NewSystemInfoService(sys, time.Second*5)

	api.Get("/info", func(c *fiber.Ctx) error {
		info, err := infoService.GetSystemInfo()
		if err != nil {
			return c.JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.JSON(info)
	})
	api.Get("/process/:pid", func(c *fiber.Ctx) error {
		info, err := infoService.GetSystemInfo()
		if err != nil {
			return c.JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		pid, err := c.ParamsInt("pid")
		if err != nil {
			return c.JSON(fiber.Map{
				"error": "invalid PID",
			})
		}
		process := slices.IndexFunc(info.DynamicInfo.Processes, func(p system.Process) bool {
			return p.PID == int32(pid)
		})
		if process == -1 {
			return c.JSON(fiber.Map{
				"error": "process not found",
			})
		}
		return c.JSON(info.DynamicInfo.Processes[process])
	})
	api.Post("/process/:pid/kill", func(c *fiber.Ctx) error {
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
	api.Post("/process/:pid/terminate", func(c *fiber.Ctx) error {
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
	api.Get("/logs", func(c *fiber.Ctx) error {
		logOptions := getLogOptionsFromCtx(c)
		reader, err := sys.GetSystemLogs(logOptions)
		return sendReader(c, reader, err)
	})
	api.Get("/service/:name", func(c *fiber.Ctx) error {
		info, err := infoService.GetSystemInfo()
		if err != nil {
			return c.JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		name := c.Params("name")
		service := slices.IndexFunc(info.DynamicInfo.Services, func(s system.Service) bool {
			return s.Name == name
		})
		if service == -1 {
			return c.JSON(fiber.Map{
				"error": "service not found",
			})
		}
		return c.JSON(info.DynamicInfo.Services[service])
	})
	api.Get("/service/:name/logs", func(c *fiber.Ctx) error {
		name := c.Params("name")
		logOptions := getLogOptionsFromCtx(c)
		reader, err := sys.GetServiceLog(name, logOptions)
		return sendReader(c, reader, err)
	})

	if err := app.Listen(":9100"); err != nil {
		slog.Error("server", "error", err)
	}
}

func getLogOptionsFromCtx(c *fiber.Ctx) system.LogOptions {
	var logOptions system.LogOptions
	if since := c.QueryInt("since", -1); since != -1 {
		t := time.Unix(int64(since), 0)
		logOptions.Since = &t
	}
	if until := c.QueryInt("until", -1); until != -1 {
		t := time.Unix(int64(until), 0)
		logOptions.Until = &t
	}
	logOptions.ThisBootOnly = c.QueryBool("this_boot_only", false)
	return logOptions
}

func sendReader(c *fiber.Ctx, reader io.ReadCloser, err error) error {
	if err != nil {
		return c.JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	c.Set("Content-Type", "text/plain; charset=utf-8")
	c.Set("Transfer-Encoding", "chunked")
	c.SendStream(reader, -1)
	return nil
}
