import boto3
import os
from botocore.client import Config

def init_minio():
    endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    bucket_name = os.getenv("MINIO_BUCKET", "voyage-media")

    s3 = boto3.resource('s3',
        endpoint_url=endpoint if endpoint.startswith('http') else f"http://{endpoint}",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version='s3v4'),
        region_name='us-east-1'
    )

    try:
        bucket = s3.Bucket(bucket_name)
        if bucket not in s3.buckets.all():
            bucket.create()
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
        import json
        s3.BucketPolicy(bucket_name).put(Policy=json.dumps(policy))
        print(f"Public read policy applied to {bucket_name}.")
    except Exception as e:
        print(f"Error initializing Minio: {e}")

if __name__ == "__main__":
    init_minio()
