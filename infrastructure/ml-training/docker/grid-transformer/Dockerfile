FROM pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime

# Install dependencies
RUN pip install --no-cache-dir \
    mlflow==2.9.2 \
    boto3==1.34.0 \
    pandas==2.1.4 \
    scikit-learn==1.3.2 \
    psycopg2-binary==2.9.9

# Copy training script
COPY train.py /opt/ml/code/train.py

# Set working directory
WORKDIR /opt/ml/code

# Set entrypoint
ENV SAGEMAKER_PROGRAM train.py