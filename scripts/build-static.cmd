@echo off
cd /d "%~dp0..\web"
"..\node_modules\@esbuild\win32-x64\esbuild.exe" src/main.tsx --bundle --outdir=dist/assets --entry-names=app --format=esm --jsx=automatic --target=es2020 --define:process.env.NODE_ENV=\"production\" --minify
