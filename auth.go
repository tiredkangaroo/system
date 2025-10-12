package main

import (
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

var totpSecret = os.Getenv("SYSTEM_TOTP_SECRET")
var jwtSecret = os.Getenv("SYSTEM_JWT_SECRET")

func authInit() {
	if len(totpSecret) >= 32 && len(jwtSecret) >= 32 {
		slog.Info("authentication enabled")
	} else {
		slog.Warn("authentication disabled, set SYSTEM_TOTP_SECRET and SYSTEM_JWT_SECRET env vars where both variables have a length of at least 32 characters to enable")
		totpSecret = ""
		jwtSecret = ""
	}
}

func requireAuthMiddleware(c *fiber.Ctx) error {
	if totpSecret == "" || jwtSecret == "" {
		return c.Next()
	}
	if auth_token := c.Cookies("auth_token"); auth_token != "" {
		token, err := jwt.ParseWithClaims(auth_token, &jwt.RegisteredClaims{}, func(token *jwt.Token) (any, error) {
			return []byte(jwtSecret), nil
		})
		if err == nil && token.Valid {
			return c.Next()
		}
	}
	auth := c.Get("Authorization")
	if auth == "" {
		return sendErrorMap(c, fiber.StatusUnauthorized, errors.New("missing Authorization header and auth_token cookie, authentication required; one must be provided"))
	}
	ok, err := totp.ValidateCustom(auth, totpSecret, time.Now(), totp.ValidateOpts{
		Period:    30,
		Skew:      1,
		Digits:    8,
		Algorithm: otp.AlgorithmSHA512,
		Encoder:   otp.EncoderDefault,
	})
	if !ok || err != nil {
		fmt.Println("TOTP validation error:", err)
		return sendErrorMap(c, fiber.StatusUnauthorized, errors.New("invalid TOTP code or error validating"))
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
	})
	signed, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return sendErrorMap(c, fiber.StatusInternalServerError, err)
	}
	c.Cookie(&fiber.Cookie{
		Name:     "auth_token",
		Value:    signed,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Lax",
		Expires:  time.Now().Add(24 * time.Hour),
	})
	return c.Next()
}
