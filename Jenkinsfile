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

        stage('Test Backend') {
            steps {
                echo 'Testing backend...'
                sh '''
                    docker compose up -d
                    sleep 10
                    curl -f http://localhost:8000/health
                '''
            }
        }
    }

    post {
        always {
            sh 'docker compose down || true'
        }

        success {
            echo 'TaskFlow CI pipeline completed successfully!'
        }

        failure {
            echo 'TaskFlow CI pipeline failed!'
        }
    }
}
