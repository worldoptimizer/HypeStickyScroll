#!/bin/bash

# HypeStickyScroll Build Script
# This script minifies HypeStickyScroll.js using Closure Compiler

set -e

# Colors for output
RED='🔴'
GREEN='✅'

echo "Building HypeStickyScroll..."

# Check for Closure Compiler (npm/brew installation first, then JAR)
check_closure_compiler() {
    if command -v google-closure-compiler &> /dev/null; then
        local version=$(google-closure-compiler --version 2>&1 | grep -o 'v[0-9]*')
        echo "✓ Closure Compiler found: $version"
        return 0
    elif [ -f "node_modules/.bin/google-closure-compiler" ]; then
        echo "✓ Closure Compiler found (local npm)"
        return 0
    elif command -v closure-compiler &> /dev/null; then
        echo "✓ Closure Compiler found (brew)"
        return 0
    elif [ -f "closure-compiler.jar" ]; then
        echo "✓ Closure Compiler found (JAR)"
        return 0
    else
        echo "${RED} Closure Compiler not found. Install with:"
        echo "    npm install -g google-closure-compiler"
        echo "    OR"
        echo "    brew install closure-compiler"
        echo "    OR download JAR from:"
        echo "    https://github.com/google/closure-compiler/releases"
        return 1
    fi
}

# Get the correct command for Closure Compiler
get_closure_command() {
    if command -v google-closure-compiler &> /dev/null; then
        echo "google-closure-compiler"
    elif [ -f "node_modules/.bin/google-closure-compiler" ]; then
        echo "node_modules/.bin/google-closure-compiler"
    elif command -v closure-compiler &> /dev/null; then
        echo "closure-compiler"
    elif [ -f "closure-compiler.jar" ]; then
        echo "java -jar closure-compiler.jar"
    fi
}

# Check if Closure Compiler is available
if ! check_closure_compiler; then
    exit 1
fi

CLOSURE_CMD=$(get_closure_command)
echo "Using: $CLOSURE_CMD"
echo ""

# Define input and output files
INPUT_FILE="HypeStickyScroll.js"
OUTPUT_FILE="HypeStickyScroll.min.js"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "${RED} Input file not found: ${INPUT_FILE}"
    exit 1
fi

echo "Minifying ${INPUT_FILE}..."

# Get original size
ORIGINAL_SIZE=$(wc -c < "$INPUT_FILE" | tr -d ' ')

# Run Closure Compiler with SIMPLE optimizations
# The /*! comment will be preserved automatically
$CLOSURE_CMD \
    --js "$INPUT_FILE" \
    --js_output_file "$OUTPUT_FILE" \
    --compilation_level SIMPLE \
    --warning_level QUIET

# Check if compilation succeeded
if [ $? -eq 0 ] && [ -f "$OUTPUT_FILE" ]; then
    MINIFIED_SIZE=$(wc -c < "$OUTPUT_FILE" | tr -d ' ')
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    
    echo ""
    echo "${GREEN} Build completed successfully!"
    echo "   Output: ${OUTPUT_FILE}"
    echo "   Original size: $ORIGINAL_SIZE bytes"
    echo "   Minified size: $MINIFIED_SIZE bytes ($FILE_SIZE)"
    
    if [ "$ORIGINAL_SIZE" -gt 0 ]; then
        REDUCTION=$(( (ORIGINAL_SIZE - MINIFIED_SIZE) * 100 / ORIGINAL_SIZE ))
        echo "   Reduction: ${REDUCTION}%"
    fi
else
    echo "${RED} Build failed!"
    exit 1
fi

