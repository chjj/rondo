all:
	@./bin/build lib rondo.js

clean:
	@rm rondo.js
	@rm rondo.min.js

.PHONY: clean all
