FROM maven:3.9.9-eclipse-temurin-17 AS builder

WORKDIR /workspace

ARG SERVICE_PATH

COPY . .

WORKDIR /workspace/${SERVICE_PATH}

RUN mvn -B -DskipTests clean package

RUN cp target/*.jar /app.jar

FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=builder /app.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]