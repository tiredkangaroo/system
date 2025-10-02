package main

import (
	"errors"
	"io"
	"log/slog"
	"os"
	"runtime"
	"slices"
	"syscall"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/tiredkangaroo/system/linux"
	"github.com/tiredkangaroo/system/system"
)

var DEBUG = os.Getenv("DEBUG") == "true"

func main() {
	var sys system.System
	switch runtime.GOOS {
	case "linux", "darwin":
		sys = &linux.LinuxSystem{}
	default:
		panic("Unsupported OS")
	}

	app := fiber.New()

	api := app.Group("/api/v1", cors.New(cors.Config{
		AllowOrigins:  "*",
		AllowHeaders:  "Origin, Content-Type, Accept, Authorization",
		AllowMethods:  "GET, POST, PATCH, DELETE, OPTIONS",
		ExposeHeaders: "Content-Length, Content-Type",
		MaxAge:        3600,
	}))

	infoService := system.NewSystemInfoService(sys, time.Second*5)

	api.Get("/info", func(c *fiber.Ctx) error {
		info, err := infoService.GetSystemInfo()
		if err != nil {
			return sendErrorMap(c, fiber.StatusInternalServerError, err)
		}
		return c.JSON(info)
	})
	api.Get("/info/ws", websocket.New(func(c *websocket.Conn) {
		info, err := infoService.GetSystemInfo()
		if err != nil {
			slog.Error("websocket get system info", "error", err)
			return
		}
		err = c.WriteJSON(info)
		if err != nil {
			slog.Error("websocket write json", "error", err)
			return
		}
		ticker := time.NewTicker(system.InfoRefreshInterval)
		defer ticker.Stop()
		defer c.Close()
		for range ticker.C {
			info, err := infoService.GetSystemInfo()
			if err != nil {
				slog.Error("websocket get system info", "error", err)
				break
			}
			err = c.WriteJSON(info)
			if err != nil {
				slog.Error("websocket write json", "error", err)
				break
			}
		}
	}))
	api.Get("/process/:pid", func(c *fiber.Ctx) error {
		info, err := infoService.GetSystemInfo()
		if err != nil {
			return sendErrorMap(c, fiber.StatusInternalServerError, err)
		}
		pid, err := c.ParamsInt("pid")
		if err != nil {
			return sendErrorMap(c, fiber.StatusBadRequest, errors.New("invalid PID"))
		}
		process := slices.IndexFunc(info.DynamicInfo.Processes, func(p system.Process) bool {
			return p.PID == int32(pid)
		})
		if process == -1 {
			return sendErrorMap(c, fiber.StatusNotFound, errors.New("process not found"))
		}
		return c.JSON(info.DynamicInfo.Processes[process])
	})
	// api.Post("/process/:pid/kill", func(c *fiber.Ctx) error {
	// 	pid, err := c.ParamsInt("pid")
	// 	if err != nil {
	// 		return sendErrorMap(c, fiber.StatusBadRequest, errors.New("invalid PID"))
	// 	}
	// 	err = syscall.Kill(pid, syscall.SIGKILL)
	// 	return sendErrorMap(c, fiber.StatusInternalServerError, err)
	// })
	// api.Post("/process/:pid/terminate", func(c *fiber.Ctx) error {
	// 	pid, err := c.ParamsInt("pid")
	// 	if err != nil {
	// 		return sendErrorMap(c, fiber.StatusBadRequest, errors.New("invalid PID"))
	// 	}
	// 	err = syscall.Kill(pid, syscall.SIGTERM)
	// 	return sendErrorMap(c, fiber.StatusInternalServerError, err)
	// })
	api.Post("/process/:pid/signal/:signal", func(c *fiber.Ctx) error {
		pid, err := c.ParamsInt("pid")
		if err != nil {
			return sendErrorMap(c, fiber.StatusBadRequest, errors.New("invalid PID"))
		}
		signal := c.Params("signal")
		var syscallSignal syscall.Signal
		switch signal {
		case "SIGKILL":
			syscallSignal = syscall.SIGKILL
		case "SIGTERM":
			syscallSignal = syscall.SIGTERM
		case "SIGSTOP":
			syscallSignal = syscall.SIGSTOP
		case "SIGCONT":
			syscallSignal = syscall.SIGCONT
		case "SIGQUIT":
			syscallSignal = syscall.SIGQUIT
		default:
			return sendErrorMap(c, fiber.StatusBadRequest, errors.New("signal is invalid"))
		}
		err = syscall.Kill(pid, syscallSignal)
		return sendErrorMap(c, fiber.StatusInternalServerError, err)
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
			return sendErrorMap(c, fiber.StatusNotFound, errors.New("service not found"))
		}
		return c.JSON(info.DynamicInfo.Services[service])
	})
	api.Get("/service/:name/logs", func(c *fiber.Ctx) error {
		name := c.Params("name")
		logOptions := getLogOptionsFromCtx(c)
		reader, err := sys.GetServiceLog(name, logOptions)
		return sendReader(c, reader, err)
	})
	api.Patch("/service/:name/start", privilegeMiddleware, func(c *fiber.Ctx) error {
		name := c.Params("name")
		err := sys.StartService(name)
		return sendErrorMap(c, fiber.StatusInternalServerError, err)
	})
	api.Patch("/service/:name/stop", privilegeMiddleware, func(c *fiber.Ctx) error {
		name := c.Params("name")
		err := sys.StopService(name)
		return sendErrorMap(c, fiber.StatusInternalServerError, err)
	})
	api.Patch("/service/:name/restart", privilegeMiddleware, func(c *fiber.Ctx) error {
		name := c.Params("name")
		err := sys.RestartService(name)
		return sendErrorMap(c, fiber.StatusInternalServerError, err)
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
func sendErrorMap(c *fiber.Ctx, errStatus int, err error) error {
	if err != nil {
		return c.Status(errStatus).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"error": nil,
	})
}

func privilegeMiddleware(c *fiber.Ctx) error {
	if os.Geteuid() == 0 {
		return c.Next()
	}
	return sendErrorMap(c, fiber.StatusForbidden, errors.New("this action requires root privileges to perform (try running with sudo or as root)"))
}
