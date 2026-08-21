import os
import sys
import unittest
from predict_pipeline import predict_rf, predict, DiseasePredictor

class TestDiseasePredictionPipeline(unittest.TestCase):

    def setUp(self):
        self.predictor = DiseasePredictor()

    def test_01_predict_rf_standard(self):
        """Test predict_rf with standard known symptoms and behavioral data."""
        res = self.predictor.predict_rf(
            sleep_hours=7.0,
            steps=4000,
            calories=2000,
            water_liters=2.0,
            symptoms_list=["Fever", "Runny Nose", "Cough"]
        )
        self.assertIn("prediction", res)
        self.assertIn("confidence", res)
        self.assertIn("top_3_alternatives", res)
        self.assertIn("unrecognized_symptoms", res)
        self.assertEqual(len(res["unrecognized_symptoms"]), 0)
        self.assertEqual(len(res["top_3_alternatives"]), 3)
        self.assertIsInstance(res["confidence"], float)
        print("\n[Test 1] Standard predict_rf Output:")
        print(res)

    def test_02_predict_rf_unrecognized_symptoms(self):
        """Test predict_rf flags unrecognized symptoms properly without dropping them."""
        res = self.predictor.predict_rf(
            sleep_hours=6.0,
            steps=5000,
            calories=1800,
            water_liters=1.5,
            symptoms_list=["Fever", "exhausted", "head pain"]
        )
        self.assertIn("exhausted", res["unrecognized_symptoms"])
        self.assertIn("head pain", res["unrecognized_symptoms"])
        print("\n[Test 2] Unrecognized Symptoms Output:")
        print(res)

    def test_03_reject_empty_symptoms(self):
        """Test that predict_rf rejects empty symptoms_list with ValueError."""
        with self.assertRaises(ValueError):
            self.predictor.predict_rf(7.0, 5000, 2000, 2.0, [])
        with self.assertRaises(ValueError):
            self.predictor.predict_rf(7.0, 5000, 2000, 2.0, ["   "])

    def test_04_combined_predict_no_fallback(self):
        """Test combined predict() returns llm_review: None when high confidence and no unrecognized symptoms."""
        res = predict(
            sleep_hours=7.0,
            steps=4000,
            calories=2000,
            water_liters=2.0,
            symptoms_list=["Fever", "Runny Nose", "Cough"],
            second_opinion=False
        )
        self.assertIn("llm_review", res)
        print("\n[Test 4] Combined Predict (No Fallback Triggered):")
        print(res)

    def test_05_combined_predict_with_llm_fallback(self):
        """Test combined predict() triggers LLM review when unrecognized symptoms or second opinion requested."""
        res = predict(
            sleep_hours=4.0,
            steps=8000,
            calories=1500,
            water_liters=0.8,
            symptoms_list=["Extreme Thirst", "Dark Urine", "exhausted"],
            second_opinion=False
        )
        self.assertIsNotNone(res["llm_review"])
        llm = res["llm_review"]
        self.assertIn("final_diagnosis", llm)
        self.assertIn("confidence", llm)
        self.assertIn("reasoning", llm)
        self.assertIn("agrees_with_rf_model", llm)
        self.assertIn("recommend_clinical_follow_up", llm)
        self.assertIn("unmapped_symptoms", llm)
        print("\n[Test 5] Combined Predict (LLM Fallback Triggered):")
        print(res)

    def test_06_urgent_symptoms_llm_fallback(self):
        """Test urgent symptoms trigger clinical follow-up flag in LLM review."""
        res = predict(
            sleep_hours=6.0,
            steps=3000,
            calories=1800,
            water_liters=1.5,
            symptoms_list=["chest pain", "Shortness of Breath"],
            second_opinion=True
        )
        self.assertIsNotNone(res["llm_review"])
        self.assertTrue(res["llm_review"]["recommend_clinical_follow_up"])
        print("\n[Test 6] Urgent Symptoms Safety Flag:")
        print(res["llm_review"])

if __name__ == "__main__":
    unittest.main()
