FROM tensorflow/tensorflow:2.15.0-gpu

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