.PHONY: server

server:
	@echo "# url: http://localhost:3456/"
	python3 -m http.server 3456
