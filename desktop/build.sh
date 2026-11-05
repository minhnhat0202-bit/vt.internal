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
cp AppIcon.icns "$RES/"                                   # icon vẽ từ icon.svg (xem ghi chú cuối file)
printf 'APPL????' > "$APP/Contents/PkgInfo"
cp meo.html apps.json "$RES/desktop/"
cp ../tv/content.js "$RES/tv/"
cp ../fonts/FSPFBeauSansPro-Bold.otf ../fonts/FSPFBeauSansPro-Black.ttf "$RES/fonts/"
xattr -cr "$APP"                                   # iCloud/Finder gắn thuộc tính phụ, codesign không chịu
codesign --force --deep -s - "$APP" || echo "codesign lỗi (app vẫn chạy được trên máy này nhờ chữ ký ad-hoc của linker)"
echo "Đã dựng $PWD/$APP"
# --run: chạy bản vừa dựng tại chỗ. --install: chép sang /Applications (ngoài iCloud, Login Items trỏ vào đó) rồi chạy bản ấy.
if [[ "$1" == "--run" ]]; then pkill -x MeoRobot 2>/dev/null || true; open "$APP"; fi
if [[ "$1" == "--install" ]]; then pkill -x MeoRobot 2>/dev/null || true; rm -rf "/Applications/$APP"; cp -R "$APP" /Applications/ && echo "Đã chép vào /Applications/$APP" && open "/Applications/$APP"; fi
# Làm lại icon khi sửa icon.svg: render icon.svg ra PNG 1024 trong suốt (Chrome headless --default-background-color=00000000),
# sips -z ra các cỡ 16…512 và @2x vào AppIcon.iconset/, rồi iconutil -c icns AppIcon.iconset -o AppIcon.icns.
