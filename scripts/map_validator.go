package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// MapState represents the map configuration in the game
type MapState struct {
	Width  int        `json:"width"`
	Height int        `json:"height"`
	Tiles  [][]string `json:"tiles"`
}

// ValidationResult contains the validation outcome
type ValidationResult struct {
	Valid  bool     `json:"valid"`
	Errors []string `json:"errors"`
}

func validateMap(data MapState) ValidationResult {
	result := ValidationResult{Valid: true, Errors: []string{}}

	if data.Width <= 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "Map width must be positive")
	}

	if data.Height <= 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "Map height must be positive")
	}

	if len(data.Tiles) != data.Height {
		result.Valid = false
		result.Errors = append(result.Errors, fmt.Sprintf("Tiles height %d does not match declared height %d", len(data.Tiles), data.Height))
	}

	for i, row := range data.Tiles {
		if len(row) != data.Width {
			result.Valid = false
			result.Errors = append(result.Errors, fmt.Sprintf("Row %d has width %d, expected %d", i, len(row), data.Width))
		}
	}

	return result
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run map_validator.go <map-json-file>")
		os.Exit(1)
	}

	filename := os.Args[1]
	absPath, err := filepath.Abs(filename)
	if err != nil {
		fmt.Printf("Error resolving path: %v\n", err)
		os.Exit(1)
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		fmt.Printf("Error reading file: %v\n", err)
		os.Exit(1)
	}

	var mapData MapState
	if err := json.Unmarshal(data, &mapData); err != nil {
		fmt.Printf("Error parsing JSON: %v\n", err)
		os.Exit(1)
	}

	result := validateMap(mapData)
	output, _ := json.MarshalIndent(result, "", "  ")
	fmt.Println(string(output))

	if !result.Valid {
		os.Exit(1)
	}
}
