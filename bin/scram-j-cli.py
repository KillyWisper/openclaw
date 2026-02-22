#!/usr/bin/env python3
"""
SCRAM-J CLI Wrapper for OpenClaw
Bridges OpenClaw's CLI backend interface to Spark's SCRAM-J HTTP API.
Output: JSONL compatible with OpenClaw's parseCliJsonl().
"""
import argparse
import json
import os
import sys
import urllib.request
import urllib.error

ENDPOINT = os.environ.get("SCRAM_J_ENDPOINT", "http://spark:9000")
MAX_SYSTEM_PROMPT_CHARS = 800   # Legacy SCRAM-J Responder limit
MAX_SYSTEM_PROMPT_DUAL = 4000   # Nemotron-9B has 128K context, be generous
MODEL_MAP = {
    "default": "dual-9b",
    "dual": "dual-9b",
    "scram-j": "scram-j",
    "direct": "responder-direct",
    "nemotron": "nemotron-direct",
}


def main():
    parser = argparse.ArgumentParser(description="SCRAM-J CLI wrapper")
    parser.add_argument("--model", "-m", default="default")
    parser.add_argument("--session-id", default=None)
    parser.add_argument("--append-system-prompt", default=None)
    parser.add_argument("prompt", nargs="?", default=None)
    args = parser.parse_args()

    # Read prompt from arg or stdin
    prompt = args.prompt
    if not prompt:
        prompt = sys.stdin.read().strip()
    if not prompt:
        print('{"item":{"text":"(empty prompt)","type":"message"}}', flush=True)
        return

    # Resolve model name first (needed for system prompt limit)
    model = MODEL_MAP.get(args.model, args.model)

    # Build messages (truncate system prompt based on model)
    messages = []
    if args.append_system_prompt:
        sp = args.append_system_prompt
        # Dual-9b has 128K context; legacy scram-j has limited KV
        max_sp = MAX_SYSTEM_PROMPT_DUAL if model in ("dual-9b", "nemotron-direct") else MAX_SYSTEM_PROMPT_CHARS
        if len(sp) > max_sp:
            sp = sp[:max_sp]
        messages.append({"role": "system", "content": sp})
    messages.append({"role": "user", "content": prompt})

    # Build request
    payload = json.dumps({
        "model": model,
        "messages": messages,
    }).encode("utf-8")

    url = f"{ENDPOINT}/v1/chat/completions"
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(json.dumps({
            "item": {"text": f"SCRAM-J connection error: {e}", "type": "message"},
        }), flush=True)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "item": {"text": f"SCRAM-J error: {e}", "type": "message"},
        }), flush=True)
        sys.exit(1)

    # Extract response
    choice = data.get("choices", [{}])[0]
    content = choice.get("message", {}).get("content", "(no response)")
    usage = data.get("usage", {})
    trace_id = data.get("scram_j", {}).get("trace_id", "")

    # Output JSONL (OpenClaw expected format)
    output = {
        "thread_id": trace_id or args.session_id or "",
        "item": {
            "text": content,
            "type": "message",
        },
        "usage": {
            "input_tokens": usage.get("prompt_tokens", 0),
            "output_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        },
    }
    print(json.dumps(output, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
