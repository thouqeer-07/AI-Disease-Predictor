import sys
import json
import os

# Add ml_model directory to sys.path
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

from predict_pipeline import predict

def main():
    try:
        # Read JSON input from stdin or argument
        if len(sys.argv) > 1:
            raw_input = sys.argv[1]
        else:
            raw_input = sys.stdin.read()

        if not raw_input.strip():
            print(json.dumps({"error": "Empty input provided"}))
            sys.exit(1)

        data = json.loads(raw_input)

        has_behavioral_data = bool(data.get("has_behavioral_data", False))
        sleep_hours = float(data.get("sleep_hours", 7.0))
        steps = int(data.get("steps", 5000))
        calories = int(data.get("calories", 2000))
        water_liters = float(data.get("water_liters", 2.0))
        
        raw_symptoms = data.get("symptoms", [])
        if isinstance(raw_symptoms, str):
            symptoms_list = [s.strip() for s in raw_symptoms.split(',') if s.strip()]
        elif isinstance(raw_symptoms, list):
            symptoms_list = raw_symptoms
        else:
            symptoms_list = [str(raw_symptoms)]

        second_opinion = bool(data.get("second_opinion", False))

        sys.stderr.write(f"[PYTHON ML MODEL] Working - Executing (has_behavioral_data={has_behavioral_data})\n")

        # Run prediction pipeline
        result = predict(
            sleep_hours=sleep_hours,
            steps=steps,
            calories=calories,
            water_liters=water_liters,
            symptoms_list=symptoms_list,
            has_behavioral_data=has_behavioral_data,
            second_opinion=second_opinion
        )

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
