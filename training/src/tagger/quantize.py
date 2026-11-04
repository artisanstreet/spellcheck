import argparse
import shutil
from pathlib import Path

import onnx
from onnxruntime.quantization import QuantType, quantize_dynamic
from onnxruntime.transformers.float16 import convert_float_to_float16

companions = ["tokenizer.json", "tokenizer_config.json", "labels.txt"]


def to_float16(source: Path, target: Path) -> None:
    model = convert_float_to_float16(onnx.load(source), keep_io_types=True)
    onnx.save(model, target)


def to_int8(source: Path, target: Path, operators: list[str] = ["MatMul", "Gather"]) -> None:
    quantize_dynamic(source, target, weight_type=QuantType.QInt8, op_types_to_quantize=operators, per_channel=True)


def to_mixed(source: Path, target: Path) -> None:
    to_int8(source, target, ["Gather"])
    model = convert_float_to_float16(onnx.load(target), keep_io_types=True, op_block_list=["DequantizeLinear"])
    onnx.save(model, target)


precisions = {"fp16": to_float16, "int8": to_int8, "mixed": to_mixed}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--precision", choices=sorted(precisions), default="mixed")
    arguments = parser.parse_args()

    arguments.output.mkdir(parents=True, exist_ok=True)
    precisions[arguments.precision](arguments.input / "model.onnx", arguments.output / "model.onnx")
    for name in companions:
        shutil.copy(arguments.input / name, arguments.output / name)
    size = (arguments.output / "model.onnx").stat().st_size / 1e6
    print(f"{arguments.precision} model written to {arguments.output} ({size:.1f} MB)")
