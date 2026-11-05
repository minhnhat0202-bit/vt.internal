#!/bin/zsh
# Dựng desktop/MeoRobot.app (không commit). Cần Xcode Command Line Tools (swiftc). Chạy: desktop/build.sh [--run]
# App chứa bản sao meo.html, apps.json, tv/content.js và font, nên sửa mấy file đó xong phải chạy lại script này.
set -e
cd "$(dirname "$0")"
APP=MeoRobot.app
RES=$APP/Contents/Resources
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$RES/desktop" "$RES/tv" "$RES/fonts"
swiftc -O -swift-version 5 -framework Cocoa -framework WebKit -o "$APP/Contents/MacOS/MeoRobot" main.swift
cp Info.plist "$APP/Contents/Info.plist"
printf 'APPL????' > "$APP/Contents/PkgInfo"
cp meo.html apps.json "$RES/desktop/"
cp ../tv/content.js "$RES/tv/"
cp ../fonts/FSPFBeauSansPro-Bold.otf ../fonts/FSPFBeauSansPro-Black.ttf "$RES/fonts/"
xattr -cr "$APP"                                   # iCloud/Finder gắn thuộc tính phụ, codesign không chịu
codesign --force --deep -s - "$APP" || echo "codesign lỗi (app vẫn chạy được trên máy này nhờ chữ ký ad-hoc của linker)"
echo "Đã dựng $PWD/$APP"
if [[ "$1" == "--run" ]]; then pkill -x MeoRobot 2>/dev/null || true; open "$APP"; fi
