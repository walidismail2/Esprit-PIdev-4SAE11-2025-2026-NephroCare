CREATE DATABASE IF NOT EXISTS nephro_users_db;
CREATE DATABASE IF NOT EXISTS clinical_db;
CREATE DATABASE IF NOT EXISTS hospitalization_db;
CREATE DATABASE IF NOT EXISTS diagnostic_db;
CREATE DATABASE IF NOT EXISTS dialysis_db;
CREATE DATABASE IF NOT EXISTS pharmacy_db;
CREATE DATABASE IF NOT EXISTS order_db;
CREATE DATABASE IF NOT EXISTS monitoring_db;

-- The MySQL image creates MYSQL_USER before this script runs.
-- These statements run only when the data directory is empty.
GRANT ALL PRIVILEGES ON nephro_users_db.* TO 'nephro'@'%';
GRANT ALL PRIVILEGES ON clinical_db.* TO 'nephro'@'%';
GRANT ALL PRIVILEGES ON hospitalization_db.* TO 'nephro'@'%';
GRANT ALL PRIVILEGES ON diagnostic_db.* TO 'nephro'@'%';
GRANT ALL PRIVILEGES ON dialysis_db.* TO 'nephro'@'%';
GRANT ALL PRIVILEGES ON pharmacy_db.* TO 'nephro'@'%';
GRANT ALL PRIVILEGES ON order_db.* TO 'nephro'@'%';
GRANT ALL PRIVILEGES ON monitoring_db.* TO 'nephro'@'%';
FLUSH PRIVILEGES;
