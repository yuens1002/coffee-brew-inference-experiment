"""
Coffee Brew Inference Script — DSPy Prototype
Part of coffee-brew-inference-experiment (TypeScript-anchored repo)
"""

import dspy
import json
import sys
import os
from typing import List, Optional

# ── Configure LM (uses OpenRouter provider)
lm = dspy.LM(
    model="openrouter/tencent/hy3-preview",  # Use openrouter/ prefix for OpenRouter models
    max_tokens=512,
    temperature=0.7
)
dspy.settings.configure(lm=lm)


# ── DSPy Signature: Coffee Input → Brew Recommendation
class BrewRecommendation(dspy.Signature):
    """Given brewing method and brew parameters, recommend optimal adjustments."""
    
    # Input fields
    method: str = dspy.InputField(desc="Brewing method name (e.g., Pour Over, French Press)")
    grind_size: str = dspy.InputField(desc="Grind size: extra-coarse, coarse, medium-coarse, medium, medium-fine, fine")
    water_temp_c: int = dspy.InputField(desc="Water temperature in Celsius (85-100)")
    brew_time_s: int = dspy.InputField(desc="Brew time in seconds")
    
    # Output field
    recommendation: str = dspy.OutputField(
        desc="Concise brew adjustment recommendation (2-3 sentences, actionable)"
    )


# ── Sample Training Data (10+ records matching Market Roast schema)
def get_sample_brews() -> List[dspy.Example]:
    """Return sample brew records for DSPy optimization."""
    return [
        dspy.Example(
            method="Pour Over",
            grind_size="medium",
            water_temp_c=93,
            brew_time_s=210,
            recommendation="Good baseline. For brighter notes, try 90°C water and medium-fine grind."
        ).with_inputs("method", "grind_size", "water_temp_c", "brew_time_s"),
        dspy.Example(
            method="French Press",
            grind_size="coarse",
            water_temp_c=96,
            brew_time_s=240,
            recommendation="Coarse grind and 96°C water works best for French Press to avoid over-extraction."
        ).with_inputs("method", "grind_size", "water_temp_c", "brew_time_s"),
        dspy.Example(
            method="Espresso",
            grind_size="fine",
            water_temp_c=93,
            brew_time_s=30,
            recommendation="Fine grind and 93°C water for optimal espresso extraction in 30s."
        ).with_inputs("method", "grind_size", "water_temp_c", "brew_time_s"),
        dspy.Example(
            method="AeroPress",
            grind_size="medium-fine",
            water_temp_c=90,
            brew_time_s=90,
            recommendation="Medium-fine grind and 90°C water for balanced AeroPress brew in 90s."
        ).with_inputs("method", "grind_size", "water_temp_c", "brew_time_s"),
        dspy.Example(
            method="Cold Brew",
            grind_size="coarse",
            water_temp_c=20,
            brew_time_s=43200,
            recommendation="Coarse grind and room temperature water for 12-hour cold brew extraction."
        ).with_inputs("method", "grind_size", "water_temp_c", "brew_time_s"),
    ]


# ── Metric for Optimization
def brew_metric(example: dspy.Example, pred: dspy.Prediction, trace=None) -> bool:
    """Simple metric: recommendation mentions at least one input parameter."""
    rec = pred.recommendation.lower()
    inputs_to_check = [
        example.method,
        example.grind_size,
        str(example.water_temp_c),
        str(example.brew_time_s),
    ]
    return any(attr.lower() in rec for attr in inputs_to_check if attr)


def run_inference(method: str, grind_size: str, water_temp_c: int, brew_time_s: int) -> dict:
    """Run DSPy inference and return recommendation with metadata."""
    try:
        optimized_path = "/data/coffee-brew-inference-experiment/inference/brew_optimized.json"
        
        # Load optimized model if available, else base model
        brew_module = dspy.Predict(BrewRecommendation)
        confidence = "medium"
        
        if os.path.exists(optimized_path):
            try:
                brew_module.load(optimized_path)
                confidence = "high"
            except:
                pass
        
        # Run inference
        prediction = brew_module(
            method=method,
            grind_size=grind_size,
            water_temp_c=water_temp_c,
            brew_time_s=brew_time_s
        )
        
        recommendation = prediction.recommendation
    except Exception as e:
        # Fallback mock response if LLM is unavailable
        recommendation = f"For {method} with {grind_size} grind at {water_temp_c}°C for {brew_time_s}s: " \
                       f"Adjust grind size to match method defaults, monitor extraction time closely."
        confidence = "low"
    
    return {
        "recommendation": recommendation,
        "confidence": confidence,
        "sources": ["sample_brews"]  # Could list actual training sources here
    }


# ── Main Inference Pipeline
def main():
    # Check if running in inference mode
    if "--infer" in sys.argv:
        try:
            # Read input JSON from stdin
            input_data = json.load(sys.stdin)
            required = ["method", "grind_size", "water_temp", "brew_time"]
            for field in required:
                if field not in input_data:
                    raise ValueError(f"Missing required field: {field}")
            
            result = run_inference(
                method=input_data["method"],
                grind_size=input_data["grind_size"],
                water_temp_c=int(input_data["water_temp"]),
                brew_time_s=int(input_data["brew_time"])
            )
            
            print(json.dumps(result))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)
    
    # Otherwise run training/optimization pipeline
    print("☕ Coffee Brew Inference Experiment — DSPy Prototype")
    print("=" * 60)
    
    # 1. Initialize module
    print("\n1. Initializing DSPy Predict module...")
    brew_module = dspy.Predict(BrewRecommendation)
    
    # 2. Test with a sample input
    print("\n2. Testing with sample input (Pour Over)...", flush=True)
    test_input = {
        "method": "Pour Over",
        "grind_size": "medium",
        "water_temp_c": 93,
        "brew_time_s": 210
    }
    prediction = brew_module(**test_input)
    print(f"   Input: {json.dumps(test_input, indent=2)}")
    print(f"   Recommendation: {prediction.recommendation}")
    
    # 3. Load sample data
    print("\n3. Loading sample brew dataset (5 records)...", flush=True)
    trainset = get_sample_brews()
    print(f"   Loaded {len(trainset)} samples")
    
    # 4. Optimize with BootstrapFewShot (lightweight optimizer)
    print("\n4. Optimizing with BootstrapFewShot...", flush=True)
    optimizer = dspy.BootstrapFewShot(
        metric=brew_metric,
        max_bootstrapped_demos=3,
        max_labeled_demos=3
    )
    optimized_module = optimizer.compile(brew_module, trainset=trainset)
    
    # 5. Test optimized module
    print("\n5. Testing optimized module...", flush=True)
    optimized_pred = optimized_module(**test_input)
    print(f"   Optimized Recommendation: {optimized_pred.recommendation}")
    
    # 6. Save optimized module
    print("\n6. Saving optimized module to brew_optimized.json...", flush=True)
    optimized_module.save("/data/coffee-brew-inference-experiment/inference/brew_optimized.json")
    print("   Saved successfully!")
    
    print("\n" + "=" * 60)
    print("✅ Prototype complete! Next steps:")
    print("   - Add more sample data to db/schema.sql")
    print("   - Integrate with TypeScript API (src/) via child process or REST")
    print("   - Use Hermes delegate_task to curate more brew data")


if __name__ == "__main__":
    main()