import argparse
import time
import logging
from workers.distributed_engine import DistributedWorkerInstance

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("StandaloneWorker")

def main():
    parser = argparse.ArgumentParser(description="MachineGuard AI Standalone Distributed Worker")
    parser.add_argument("--worker-id", type=str, default="worker_gamma", help="Unique identifier for the worker")
    args = parser.parse_args()

    logger.info(f"Starting standalone distributed worker process [{args.worker_id}]...")
    worker = DistributedWorkerInstance(args.worker_id)
    worker.start()

    try:
        while True:
            time.sleep(1.0)
    except KeyboardInterrupt:
        logger.info(f"Stopping worker [{args.worker_id}]...")
        worker.stop()

if __name__ == "__main__":
    main()
