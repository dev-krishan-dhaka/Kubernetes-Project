pipeline {
    agent any

    environment {
        DOCKERHUB_CREDS = credentials('dockerhub-creds')
        GITHUB_CREDS = credentials('github-creds')
        DOCKERHUB_USER = 'devkrishan001'
        IMAGE_TAG = "v${BUILD_NUMBER}"
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
                    // Get list of changed files in this commit
                    sh '''
                        git diff --name-only HEAD~1 HEAD > changed_files.txt || echo "No previous commit" > changed_files.txt
                    '''
                }
            }
        }

        stage('Build Backend') {
            steps {
                script {
                    // Only build if backend folder has changes
                    def backendChanged = sh(script: "grep -q '^backend/' changed_files.txt", returnStatus: true) == 0
                    
                    if (backendChanged) {
                        sh """
                            echo "🔨 Building backend - changes detected in backend/ folder"
                            docker build -t ${DOCKERHUB_USER}/backend:${IMAGE_TAG} ./backend
                            docker tag ${DOCKERHUB_USER}/backend:${IMAGE_TAG} ${DOCKERHUB_USER}/backend:latest
                            echo "BACKEND_BUILT=true" >> build_status.txt
                        """
                    } else {
                        echo "⏭️ Skipping backend build - no changes in backend/ folder"
                    }
                }
            }
        }

        stage('Build Frontend') {
            steps {
                script {
                    // Only build if frontend folder has changes
                    def frontendChanged = sh(script: "grep -q '^frontend/' changed_files.txt", returnStatus: true) == 0
                    
                    if (frontendChanged) {
                        sh """
                            echo "🔨 Building frontend - changes detected in frontend/ folder"
                            docker build -t ${DOCKERHUB_USER}/frontend:${IMAGE_TAG} ./frontend
                            docker tag ${DOCKERHUB_USER}/frontend:${IMAGE_TAG} ${DOCKERHUB_USER}/frontend:latest
                            echo "FRONTEND_BUILT=true" >> build_status.txt
                        """
                    } else {
                        echo "⏭️ Skipping frontend build - no changes in frontend/ folder"
                    }
                }
            }
        }

        stage('Push to DockerHub') {
            steps {
                script {
                    def backendBuilt = sh(script: "grep -q 'BACKEND_BUILT=true' build_status.txt", returnStatus: true) == 0
                    def frontendBuilt = sh(script: "grep -q 'FRONTEND_BUILT=true' build_status.txt", returnStatus: true) == 0
                    
                    if (backendBuilt || frontendBuilt) {
                        sh """
                            echo "📤 Pushing images to DockerHub"
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
                        echo "⏭️ No images to push - no changes in backend or frontend"
                        error "No changes detected - stopping pipeline"
                    }
                }
            }
        }

        stage('Update values.yaml') {
            steps {
                script {
                    def backendBuilt = sh(script: "grep -q 'BACKEND_BUILT=true' build_status.txt", returnStatus: true) == 0
                    def frontendBuilt = sh(script: "grep -q 'FRONTEND_BUILT=true' build_status.txt", returnStatus: true) == 0
                    
                    // Update only the tag that changed
                    if (backendBuilt) {
                        sh """
                            echo "📝 Updating backend image tag in values.yaml"
                            sed -i '/backend:/,/frontend:/ s|tag: ".*"|tag: "${IMAGE_TAG}"|' helm-chart/values.yaml
                        """
                    }
                    
                    if (frontendBuilt) {
                        sh """
                            echo "📝 Updating frontend image tag in values.yaml"
                            sed -i '/frontend:/,/postgres:/ s|tag: ".*"|tag: "${IMAGE_TAG}"|' helm-chart/values.yaml
                        """
                    }
                }
            }
        }

        stage('Push to GitHub') {
            when {
                expression {
                    def backendBuilt = sh(script: "grep -q 'BACKEND_BUILT=true' build_status.txt", returnStatus: true) == 0
                    def frontendBuilt = sh(script: "grep -q 'FRONTEND_BUILT=true' build_status.txt", returnStatus: true) == 0
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
            // Cleanup
            sh "rm -f changed_files.txt build_status.txt"
        }
        success {
            echo """
            ╔════════════════════════════════════════╗
            ║  ✅ CI/CD Pipeline Successful!        ║
            ╚════════════════════════════════════════╝
            
            📦 Images pushed: ${IMAGE_TAG}
            🚀 ArgoCD will auto-deploy within 3 minutes
            
            Monitor deployment:
            kubectl get pods -n user-management -w
            """
        }
        failure {
            echo """
            ╔════════════════════════════════════════╗
            ║  ❌ Pipeline Failed!                   ║
            ╚════════════════════════════════════════╝
            
            Check console output for details.
            """
        }
    }
}
