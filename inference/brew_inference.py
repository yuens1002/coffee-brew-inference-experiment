"""
Coffee Brew Inference Script — DSPy Prototype
Part of coffee-brew-inference-experiment (TypeScript-anchored repo)
"""

import dspy
import json
from typing import List, Optional

# ── Configure LM (uses Hermes Agent's default provider via OPENROUTER_API_KEY or ANTHROPIC_API_KEY)
lm = dspy.LM(
    model="tencent/hy3-preview",  # Matches current Hermes model
    max_tokens=512,
    temperature=0.7
)
dspy.settings.configure(lm=lm)


# ── DSPy Signature: Coffee Input → Brew Recommendation
class BrewRecommendation(dspy.Signature):
    """Given coffee attributes and brew parameters, recommend optimal adjustments."""
    
    # Input fields
    origin: str = dspy.InputField(desc="Coffee origin country/region (e.g., Colombia, Ethiopia)")
    roast_level: str = dspy.InputField(desc="Roast level: light, medium, medium-dark, dark")
    grind_size: str = dspy.InputField(desc="Grind size: extra-coarse, coarse, medium-coarse, medium, medium-fine, fine")
    water_temp_c: int = dspy.InputField(desc="Water temperature in Celsius (85-100)")
    ratio: float = dspy.InputField(desc="Coffee-to-water ratio (e.g., 1:16 = 0.0625)")
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
            origin="Colombia",
            roast_level="medium",
            grind_size="medium",
            water_temp_c=93,
            ratio=0.0625,  # 1:16
            brew_time_s=210,  # 3:30
            recommendation="Good baseline. For brighter notes, try 90°C water and 1:17 ratio."
        ).with_inputs("origin", "roast_level", "grind_size", "water_temp_c", "ratio", "brew_time_s"),
        dspy.Example(
            origin="Ethiopia",
            roast_level="light",
            grind_size="medium-fine",
            water_temp_c=88,
            ratio=0.0667,  # 1:15
            brew_time_s=180,  # 3:00
            recommendation="Light roast benefits from lower temp (88°C) to preserve floral notes. Use 1:15 ratio."
        ).with_inputs("origin", "roast_level", "grind_size", "water_temp_c", "ratio", "brew_time_s"),
        dspy.Example(
            origin="Brazil",
            roast_level="medium-dark",
            grind_size="coarse",
            water_temp_c=96,
            ratio=0.0588,  # 1:17
            brew_time_s=240,  # 4:00
            recommendation="Darker roast needs hotter water (96°C) and coarser grind to avoid over-extraction."
        ).with_inputs("origin", "roast_level", "grind_size", "water_temp_c", "ratio", "brew_time_s"),
        dspy.Example(
            origin="Guatemala",
            roast_level="medium",
            grind_size="medium-coarse",
            water_temp_c=92,
            ratio=0.0625,
            brew_time_s=195,  # 3:15
            recommendation="Balanced medium roast. Try medium-coarse grind and 92°C for chocolatey notes."
        ).with_inputs("origin", "roast_level", "grind_size", "water_temp_c", "ratio", "brew_time_s"),
        dspy.Example(
            origin="Kenya",
            roast_level="light",
            grind_size="fine",
            water_temp_c=89,
            ratio=0.0714,  # 1:14
            brew_time_s=150,  # 2:30
            recommendation="Kenyan light roast shines with fine grind, 89°C, and 1:14 ratio for bright acidity."
        ).with_inputs("origin", "roast_level", "grind_size", "water_temp_c", "ratio", "brew_time_s"),
        dspy.Example(
            origin="Sumatra",
            roast_level="dark",
            grind_size="coarse",
            water_temp_c=98,
            ratio=0.0556,  # 1:18
            brew_time_s=270,  # 4:30
            recommendation="Dark Sumatran needs 98°C, coarse grind, and 1:18 ratio to extract earthy notes without bitterness."
        ).with_inputs("origin", "roast_level", "grind_size", "water_temp_c", "ratio", "brew_time_s"),
        dspy.Example(
            origin="Costa Rica",
            roast_level="medium-light",
            grind_size="medium",
            water_temp_c=90,
            ratio=0.0667,
            brew_time_s=195,
            recommendation="Medium-light Costa Rican does well at 90°C, medium grind, 1:15 ratio for honey sweetness."
        ).with_inputs("origin", "roast_level", "grind_size", "water_temp_c", "ratio", "brew_time_s"),
        dspy.Example(
            origin="Yemen",
            roast_level="dark",
            grind_size="extra-coarse",
            water_temp_c=99,
            ratio=0.0526,  # 1:19
            brew_time_s=300,  # 5:00
            recommendation="Traditional Yemeni dark roast requires 99°C, extra-coarse grind, and 1:19 ratio for 5:00 brew."
        ).with_inputs("origin", "roast_level", "grind_size", "water_temp_c", "ratio", "brew_time_s"),
        dspy.Example(
            origin="Rwanda",
            roast_level="light",
            grind_size="medium-fine",
            water_temp_c=87,
            ratio=0.0714,
            brew_time_s=165,
            recommendation="Rwandan light roast at 87°C, medium-fine grind, 1:14 ratio highlights berry notes."
        ).with_inputs("origin", "roast_level", "grind_size", "water_temp_c", "ratio", "brew_time_s"),
        dspy.Example(
            origin="Colombia",
            roast_level="dark",
            grind_size="coarse",
            water_temp_c=97,
            ratio=0.0588,
            brew_time_s=255,
            recommendation="Dark Colombian needs 97°C, coarse grind, 1:17 ratio to avoid burnt flavors."
        ).with_inputs("origin", "roast_level", "grind_size", "water_temp_c", "ratio", "brew_time_s"),
    ]


# ── Metric for Optimization
def brew_metric(example: dspy.Example, pred: dspy.Prediction, trace=None) -> bool:
    """Simple metric: recommendation mentions at least one input parameter."""
    rec = pred.recommendation.lower()
    inputs_to_check = [
        example.roast_level,
        example.grind_size,
        str(example.water_temp_c),
        str(example.ratio),
    ]
    return any(attr.lower() in rec for attr in inputs_to_check if attr)


# ── Main Inference Pipeline
def main():
    print("☕ Coffee Brew Inference Experiment — DSPy Prototype")
    print("=" * 60)
    
    # 1. Initialize module
    print("\n1. Initializing DSPy Predict module...")
    brew_module = dspy.Predict(BrewRecommendation)
    
    # 2. Test with a sample input
    print("\n2. Testing with sample input (Colombia medium roast)...")
    test_input = {
        "origin": "Colombia",
        "roast_level": "medium",
        "grind_size": "medium",
        "water_temp_c": 93,
        "ratio": 0.0625,
        "brew_time_s": 210
    }
    prediction = brew_module(**test_input)
    print(f"   Input: {json.dumps(test_input, indent=2)}")
    print(f"   Recommendation: {prediction.recommendation}")
    
    # 3. Load sample data
    print("\n3. Loading sample brew dataset (10+ records)...")
    trainset = get_sample_brews()
    print(f"   Loaded {len(trainset)} samples")
    
    # 4. Optimize with BootstrapFewShot (lightweight optimizer)
    print("\n4. Optimizing with BootstrapFewShot...")
    optimizer = dspy.BootstrapFewShot(
        metric=brew_metric,
        max_bootstrapped_demos=3,
        max_labeled_demos=3
    )
    optimized_module = optimizer.compile(brew_module, trainset=trainset)
    
    # 5. Test optimized module
    print("\n5. Testing optimized module...")
    optimized_pred = optimized_module(**test_input)
    print(f"   Optimized Recommendation: {optimized_pred.recommendation}")
    
    # 6. Save optimized module
    print("\n6. Saving optimized module to brew_optimized.json...")
    optimized_module.save("/data/coffee-brew-inference-experiment/inference/brew_optimized.json")
    print("   Saved successfully!")
    
    print("\n" + "=" * 60)
    print("✅ Prototype complete! Next steps:")
    print("   - Add more sample data to db/schema.sql")
    print("   - Integrate with TypeScript API (src/) via child process or REST")
    print("   - Use Hermes delegate_task to curate more brew data")


if __name__ == "__main__":
    main()