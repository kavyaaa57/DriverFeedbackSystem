import json
import ast

input_file = "collected_data.json"
output_file = "collected_data_fixed.json"

# Open the file and fix invalid JSON lines
with open(input_file, "r") as infile, open(output_file, "w") as outfile:
    for line in infile:
        try:
            # Convert the invalid JSON (single quotes) to valid JSON
            valid_json = json.dumps(ast.literal_eval(line.strip()))
            outfile.write(valid_json + "\n")
        except Exception as e:
            print(f"Error processing line: {line.strip()} - {e}")
