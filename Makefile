TIMESTAMP := $(shell date +%s)

SRC_DIR := src
DIST_DIR := dist

CSS_FILES := $(wildcard $(SRC_DIR)/css/*.css)
MIN_CSS := $(DIST_DIR)/fuqdocs.min.css

JS_FILES := $(wildcard $(SRC_DIR)/js/*.js)
MIN_JS := $(DIST_DIR)/fuqdocs.min.js

EXTRA_FILES_SRC := $(SRC_DIR)/robots.txt $(SRC_DIR)/favicon.ico
EXTRA_FILES_DIST := $(DIST_DIR)/robots.txt $(DIST_DIR)/favicon.ico

.PHONY: build

$(DIST_DIR):
	@echo "# creating dist directory: $(DIST_DIR)"
	@mkdir -p $(DIST_DIR)

$(MIN_JS): $(JS_FILES)
	@echo "# minifying js: $^"
	uglifyjs \
		--compress --mangle \
		--source-map "url='$(patsubst $(DIST_DIR)/%,%,$(MIN_JS)).map'" \
		--output $(MIN_JS) \
		-- $(JS_FILES)

$(MIN_CSS): $(CSS_FILES)
	@echo "# minifying css"
	uglifycss \
		--output $(MIN_CSS) \
		$(CSS_FILES)

$(DIST_DIR)/index.html: $(MIN_JS) $(MIN_CSS) $(SRC_DIR)/index.html
	@echo "# regenerating index.html"
	cat $(SRC_DIR)/index.html | \
		sed -e 's/{{ TIMESTAMP }}/$(TIMESTAMP)/g' \
		> $(DIST_DIR)/index.html

$(EXTRA_FILES_DIST): $(EXTRA_FILES_SRC)
	@echo "# copy extra files"
	cp $^ $(DIST_DIR)

build: $(DIST_DIR) $(DIST_DIR)/index.html $(EXTRA_FILES_DIST)

.PHONY: clean

clean: $(DIST_DIR)
	rm $(DIST_DIR)/*

.PHONY: server

server: $(DIST_DIR)
	@echo "# url: http://localhost:3456/"
	cd $(DIST_DIR) && pwd && python3 -m http.server 3456

