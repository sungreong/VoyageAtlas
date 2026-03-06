import os
import json
from api.events import get_s3_client

def init_minio():
    bucket_name = os.getenv("MINIO_BUCKET", "voyage-media")
    s3 = get_s3_client()

    try:
        s3.head_bucket(Bucket=bucket_name)
        print(f"Bucket {bucket_name} already exists.")
    except Exception:
        s3.create_bucket(Bucket=bucket_name)
        print(f"Bucket {bucket_name} created.")

    # Set public read policy
    policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "PublicRead",
            "Effect": "Allow",
            "Principal": "*",
            "Action": ["s3:GetObject"],
            "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
        }]
    }
    s3.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))
    print(f"Public read policy applied to {bucket_name}.")

if __name__ == "__main__":
    init_minio()
