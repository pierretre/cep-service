import csv
import time
import json
import paho.mqtt.client as mqtt
from tqdm import tqdm

"""
Publishes MQTT messages from a CSV file with timing control.
This script reads MQTT message data from a CSV file and publishes each message
to a specified MQTT broker. The CSV file should contain message details including
topic, JSON payload, QoS level, retain flag, and timing information.
CSV Format:
    Column 0: topic (str) - MQTT topic to publish to
    Column 1: payload_raw (str) - JSON-encoded payload as a string
    Column 2: qos (int) - Quality of Service level (0, 1, or 2)
    Column 3: retain (str) - "true" or "false" for message retention
    Column 4: (unused)
    Column 5: delta (float) - Time delay in seconds before publishing
Constants:
    MQTT_HOST (str): The hostname or IP address of the MQTT broker
    MQTT_PORT (int): The port number of the MQTT broker
    CSV_FILE (str): Path to the CSV file containing message data
Raises:
    FileNotFoundError: If the CSV file does not exist
    json.JSONDecodeError: If the payload cannot be decoded as JSON
    ValueError: If QoS or delta values cannot be converted to appropriate types
    ConnectionRefusedError: If connection to MQTT broker fails
Example:
    The script expects a CSV file with the following format:
    home/temperature,"{\"value\": 22.5}",0,false,,1.5
    home/humidity,"{\"value\": 65}",1,true,,2.0
"""

MQTT_HOST = "localhost"
MQTT_PORT = 1883
CSV_FILE = "./recordings/simple_process_with_rennes_topics.csv"
SPEED_FACTOR = 1.0  # >1 = faster, <1 = slower

client = mqtt.Client()
client.connect(MQTT_HOST, MQTT_PORT)
# Count total messages (for percentage)
with open(CSV_FILE, newline="") as f:
    total_messages = sum(1 for _ in f)

with open(CSV_FILE, newline="") as f:
    reader = csv.reader(f)

    for row in tqdm(reader, total=total_messages, desc="Replaying MQTT"):
        topic = row[0]

        payload = json.loads(row[1])
        qos = int(row[2])
        retain = row[3].lower() == "true"
        delta = float(row[5])

        time.sleep(delta / SPEED_FACTOR)

        client.publish(
            topic=topic,
            payload=json.dumps(payload),
            qos=qos,
            retain=retain
        )

client.disconnect()