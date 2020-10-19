.PHONY: build
build:
	cd viz && npm install && tsc
	cd lobby && npm install && tsc
	cd tournament && npm install && ./node_modules/@angular/cli/bin/ng build --prod=true