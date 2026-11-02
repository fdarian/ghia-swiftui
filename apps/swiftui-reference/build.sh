#!/bin/sh
# Builds .build/swiftui-reference with the command-line toolchain: no Xcode project.
set -e
cd "$(dirname "$0")"
mkdir -p .build
swiftc -O -o .build/swiftui-reference Sources/Kit.swift Sources/Pages.swift Sources/main.swift 2>&1
