FROM python:3.12-slim

# Stdlib only. One image for the agent, the ticket server, the attacker server, and the legit API.
WORKDIR /app
COPY agent.py attacker_server.py legit.py ticket_server.py /app/
USER root
EXPOSE 80 8080
CMD ["python3", "/app/agent.py"]
