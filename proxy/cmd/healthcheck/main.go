package main

import (
	"net/http"
	"os"
	"time"
)

func main() {
	client := &http.Client{Timeout: 5 * time.Second}

	resp, err := client.Get("http://localhost:8080/v1/proxy/health")
	if err != nil || resp.StatusCode != http.StatusOK {
		os.Exit(1)
	}
}
