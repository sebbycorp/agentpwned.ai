FROM python:3.12-slim

# Stdlib only. The image is the same binary surface for Arm A and Arm B.
WORKDIR /app
COPY agent.py sink.py legit.py /app/
USER root
EXPOSE 80 8080
CMD ["python3", "/app/agent.py"]
