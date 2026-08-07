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
                    docker compose -f docker-compose.yml -f docker-compose.ci.yml up -d

                    sleep 10

                    docker compose -f docker-compose.yml -f docker-compose.ci.yml exec -T backend \
		    python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').read().decode())"
                '''
            }
        }
    }

    post {
        always {
            sh 'docker compose -f docker-compose.yml -f docker-compose.ci.yml down || true'
        }

        success {
            echo 'TaskFlow CI pipeline completed successfully!'
        }

        failure {
            echo 'TaskFlow CI pipeline failed!'
        }
    }
}
