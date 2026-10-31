#!/usr/bin/env bash
# يبني dist/index.html (صفحة واحدة مستقلة) من ملفات src. التشغيل: bash build.sh
set -e
cd "$(dirname "$0")"
mkdir -p dist
cat src/js/*.js > dist/app.js
{
  cat src/head.html
  echo '<style>'
  cat src/css/tokens.css src/css/base.css src/css/layout.css src/css/components.css src/css/views.css
  echo '</style>'
  cat src/body.html
  echo '<script>(function(){'
  cat dist/app.js
  echo '})();</script>'
} > dist/index.html
(echo '(function(){'; cat dist/app.js; echo '})();') > dist/check.js
node --check dist/check.js && echo "syntax OK"
wc -c dist/index.html
cp dist/index.html index.html && echo "copied to index.html (GitHub Pages)"
