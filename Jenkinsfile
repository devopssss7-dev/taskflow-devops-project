pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                echo 'Building TaskFlow application...'

                sh 'docker compose build'
            }
        }

        stage('Security Scan') {
            steps {
                echo 'Scanning Docker images with Trivy...'

                sh '''
                    trivy image --severity HIGH,CRITICAL task-management-app-backend
                    trivy image --severity HIGH,CRITICAL task-management-app-frontend
                '''
            }
        }

        stage('Test Backend') {
            steps {
                echo 'Testing backend...'

                sh '''
                    docker compose -f docker-compose.yml -f docker-compose.ci.yml up -d

                    sleep 10

                    docker compose -f docker-compose.yml -f docker-compose.ci.yml exec -T backend python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').read().decode())"
                '''
            }
        }

        stage('Docker Hub Push') {
            steps {
                echo 'Pushing Docker images to Docker Hub...'

                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {

                    sh '''
                        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

                        docker tag task-management-app-backend:latest "$DOCKER_USERNAME/taskflow-backend:latest"

                        docker tag task-management-app-frontend:latest "$DOCKER_USERNAME/taskflow-frontend:latest"

                        docker push "$DOCKER_USERNAME/taskflow-backend:latest"

                        docker push "$DOCKER_USERNAME/taskflow-frontend:latest"

                        docker logout
                    '''
                }
            }
        }
    }

    post {
        always {
            sh '''
                docker compose -f docker-compose.yml -f docker-compose.ci.yml down || true
            '''
        }

        success {
            echo 'TaskFlow CI pipeline completed successfully!'
        }

        failure {
            echo 'TaskFlow CI pipeline failed!'
        }
    }
}
