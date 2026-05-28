pipeline {
    agent any

    environment {
        // Use EXACT credential IDs from your Jenkins
        DOCKERHUB_CREDS = credentials('DOCKERHUB_CREDENTIALS')
        GITHUB_CREDS = credentials('GITHUB_CREDENTIALS')

        DOCKERHUB_USER = 'devkrishan001'
        IMAGE_TAG = "v${BUILD_NUMBER}"
    }

    triggers {
        pollSCM('* * * * *')
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Get Changed Files') {
            steps {
                script {
                    sh '''
                        git diff --name-only HEAD~1 HEAD > changed_files.txt 2>/dev/null || echo "" > changed_files.txt
                    '''
                }
            }
        }

        stage('Build Backend') {
            steps {
                script {

                    def backendChanged = sh(
                        script: "grep -q '^backend/' changed_files.txt",
                        returnStatus: true
                    ) == 0

                    if (backendChanged) {

                        sh """
                            echo "🔨 Building backend..."

                            docker build -t ${DOCKERHUB_USER}/backend:${IMAGE_TAG} ./backend

                            docker tag ${DOCKERHUB_USER}/backend:${IMAGE_TAG} ${DOCKERHUB_USER}/backend:latest

                            echo "BACKEND_BUILT=true" > build_status.txt
                        """

                    } else {

                        echo "⏭️ No backend changes - skipping build"

                    }
                }
            }
        }

        stage('Build Frontend') {
            steps {
                script {

                    def frontendChanged = sh(
                        script: "grep -q '^frontend/' changed_files.txt",
                        returnStatus: true
                    ) == 0

                    if (frontendChanged) {

                        sh """
                            echo "🔨 Building frontend..."

                            docker build -t ${DOCKERHUB_USER}/frontend:${IMAGE_TAG} ./frontend

                            docker tag ${DOCKERHUB_USER}/frontend:${IMAGE_TAG} ${DOCKERHUB_USER}/frontend:latest

                            echo "FRONTEND_BUILT=true" >> build_status.txt
                        """

                    } else {

                        echo "⏭️ No frontend changes - skipping build"

                    }
                }
            }
        }

        stage('Push to DockerHub') {
            steps {
                script {

                    def backendBuilt = fileExists('build_status.txt') ?
                        sh(
                            script: "grep -q 'BACKEND_BUILT=true' build_status.txt",
                            returnStatus: true
                        ) == 0 : false

                    def frontendBuilt = fileExists('build_status.txt') ?
                        sh(
                            script: "grep -q 'FRONTEND_BUILT=true' build_status.txt",
                            returnStatus: true
                        ) == 0 : false

                    if (backendBuilt || frontendBuilt) {

                        sh """
                            echo "📤 Logging into DockerHub..."

                            echo ${DOCKERHUB_CREDS_PSW} | docker login -u ${DOCKERHUB_CREDS_USR} --password-stdin
                        """

                        if (backendBuilt) {

                            sh """
                                docker push ${DOCKERHUB_USER}/backend:${IMAGE_TAG}
                                docker push ${DOCKERHUB_USER}/backend:latest
                            """

                        }

                        if (frontendBuilt) {

                            sh """
                                docker push ${DOCKERHUB_USER}/frontend:${IMAGE_TAG}
                                docker push ${DOCKERHUB_USER}/frontend:latest
                            """

                        }

                    } else {

                        echo "⏭️ No images to push - no changes detected"

                        error "No changes in backend or frontend"

                    }
                }
            }
        }

        stage('Update values.yaml') {
            steps {
                script {

                    def backendBuilt = fileExists('build_status.txt') ?
                        sh(
                            script: "grep -q 'BACKEND_BUILT=true' build_status.txt",
                            returnStatus: true
                        ) == 0 : false

                    def frontendBuilt = fileExists('build_status.txt') ?
                        sh(
                            script: "grep -q 'FRONTEND_BUILT=true' build_status.txt",
                            returnStatus: true
                        ) == 0 : false

                    if (backendBuilt) {

                        sh """
                            sed -i '/^backend:/,/^[a-z]/ s|tag: ".*"|tag: "${IMAGE_TAG}"|' helm-chart/values.yaml
                        """

                    }

                    if (frontendBuilt) {

                        sh """
                            sed -i '/^frontend:/,/^[a-z]/ s|tag: ".*"|tag: "${IMAGE_TAG}"|' helm-chart/values.yaml
                        """

                    }
                }
            }
        }

        stage('Push to GitHub') {
            when {
                expression {

                    def backendBuilt = fileExists('build_status.txt') ?
                        sh(
                            script: "grep -q 'BACKEND_BUILT=true' build_status.txt",
                            returnStatus: true
                        ) == 0 : false

                    def frontendBuilt = fileExists('build_status.txt') ?
                        sh(
                            script: "grep -q 'FRONTEND_BUILT=true' build_status.txt",
                            returnStatus: true
                        ) == 0 : false

                    return backendBuilt || frontendBuilt
                }
            }

            steps {
                script {

                    sh """
                        git config user.email "jenkins@ci.com"
                        git config user.name "Jenkins CI"

                        git add helm-chart/values.yaml

                        git diff --cached --quiet || git commit -m "ci: update image tag to ${IMAGE_TAG} [skip ci]"

                        git push https://\${GITHUB_CREDS_USR}:\${GITHUB_CREDS_PSW}@github.com/dev-krishan-dhaka/Kubernetes-Project.git HEAD:main
                    """

                }
            }
        }
    }

    post {

        always {
            script {
                sh 'rm -f changed_files.txt build_status.txt || true'
            }
        }

        success {

            echo """
            ╔════════════════════════════════════════╗
            ║  ✅ CI/CD Pipeline Successful!        ║
            ╚════════════════════════════════════════╝

            🏷️  Image Tag: ${IMAGE_TAG}

            🐳 DockerHub:
            ${DOCKERHUB_USER}/backend:${IMAGE_TAG}

            🐳 DockerHub:
            ${DOCKERHUB_USER}/frontend:${IMAGE_TAG}

            🚀 ArgoCD will auto-deploy within 3 minutes
            """
        }

        failure {

            echo """
            ╔════════════════════════════════════════╗
            ║  ❌ Pipeline Failed!                  ║
            ╚════════════════════════════════════════╝

            Check the error above for details.
            """
        }
    }
}
