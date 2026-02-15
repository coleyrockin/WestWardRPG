#!/usr/bin/env python3
import json
import sys
from pathlib import Path


def collect_scenarios(output_root: Path):
    scenarios = []
    if not output_root.exists() or not output_root.is_dir():
        return scenarios

    for scenario_dir in sorted(output_root.iterdir()):
        if not scenario_dir.is_dir():
            continue

        state_files = sorted(scenario_dir.glob("state-*.json"))
        error_files = sorted(scenario_dir.glob("errors-*.json"))

        scenarios.append(
            {
                "name": scenario_dir.name,
                "states": len(state_files),
                "errors": len(error_files),
            }
        )
    return scenarios


def main():
    root_arg = sys.argv[1] if len(sys.argv) > 1 else "output"
    output_root = Path(root_arg).resolve()

    scenarios = collect_scenarios(output_root)
    if not scenarios:
        print(f"No scenario directories found in: {output_root}")
        return 0

    total_states = sum(s["states"] for s in scenarios)
    total_errors = sum(s["errors"] for s in scenarios)

    print(f"Scenario report for: {output_root}")
    print("-" * 56)
    for item in scenarios:
        print(
            f"{item['name']:<32} states={item['states']:<3} errors={item['errors']:<3}"
        )

    print("-" * 56)
    print(
        json.dumps(
            {
                "scenario_count": len(scenarios),
                "total_states": total_states,
                "total_errors": total_errors,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
