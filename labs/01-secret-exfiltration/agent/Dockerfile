FROM python:3.12-slim

# Stdlib only. The image is the same binary surface for the bare agent and the sandboxed agent.
WORKDIR /app
COPY agent.py attacker_server.py legit.py /app/
USER root
EXPOSE 80 8080
CMD ["python3", "/app/agent.py"]
