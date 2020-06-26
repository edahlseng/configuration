dist: sources
	npm run build

build: dist

.PHONY: test
test: build
	npm run test
