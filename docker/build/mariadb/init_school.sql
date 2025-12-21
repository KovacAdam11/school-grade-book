-- =========================================
-- ŽIACKA KNIŽKA - init_school.sql
-- MariaDB / MySQL (InnoDB)
-- =========================================

SET NAMES utf8mb4;
SET time_zone = '+01:00';

-- (Pre vývoj) Drop v správnom poradí
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS class_subjects;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS roles;

-- =========================================
-- TABUĽKY
-- =========================================

CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,   -- ADMIN, TEACHER, STUDENT
  name VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grade_year INT NOT NULL,            -- ročník (1-4)
  name_letter VARCHAR(5) NOT NULL,    -- A, B, C
  UNIQUE KEY uq_class (grade_year, name_letter)
) ENGINE=InnoDB;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name  VARCHAR(100) NOT NULL,
  email VARCHAR(255) NULL UNIQUE,
  role_id INT NOT NULL,
  class_id INT NULL,                  -- len pre STUDENT (žiak v jednej triede)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (class_id) REFERENCES classes(id)
) ENGINE=InnoDB;

CREATE TABLE subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Každý predmet v triede má presne 1 učiteľa:
-- UNIQUE(class_id, subject_id) vynúti pravidlo zo zadania
CREATE TABLE class_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  subject_id INT NOT NULL,
  teacher_id INT NOT NULL,            -- users.id (TEACHER)
  UNIQUE KEY uq_class_subject (class_id, subject_id),
  KEY idx_teacher (teacher_id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Prihlásenie žiaka na predmety svojej triedy:
-- Pre každého žiaka vytvoríme zápis pre všetky class_subjects jeho triedy
CREATE TABLE enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,           -- users.id (STUDENT)
  class_subject_id INT NOT NULL,     -- class_subjects.id
  UNIQUE KEY uq_enrollment (student_id, class_subject_id),
  KEY idx_enr_student (student_id),
  KEY idx_enr_cs (class_subject_id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (class_subject_id) REFERENCES class_subjects(id)
) ENGINE=InnoDB;

-- Známky
CREATE TABLE grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL,        -- musí existovať prihlásenie
  teacher_id INT NOT NULL,           -- učiteľ, ktorý hodnotil
  value TINYINT NOT NULL,
  graded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note VARCHAR(255) NULL,
  KEY idx_grade_enr (enrollment_id),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  CONSTRAINT chk_grade_value CHECK (value BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- =========================================
-- TRIGGERS - vynútenie pravidiel
-- =========================================
DELIMITER //

-- známku môže vložiť iba učiteľ priradený k (trieda, predmet)
-- a študent musí byť prihlásený (enrollment existuje)
CREATE TRIGGER trg_grades_before_insert
BEFORE INSERT ON grades
FOR EACH ROW
BEGIN
  DECLARE cs_teacher INT;
  DECLARE enr_cs_id INT;

  SELECT class_subject_id INTO enr_cs_id
  FROM enrollments
  WHERE id = NEW.enrollment_id;

  IF enr_cs_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Neplatný enrollment_id';
  END IF;

  SELECT teacher_id INTO cs_teacher
  FROM class_subjects
  WHERE id = enr_cs_id;

  IF cs_teacher IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Neplatný class_subject pre enrollment';
  END IF;

  IF NEW.teacher_id <> cs_teacher THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Učiteľ nie je priradený k predmetu v triede';
  END IF;

  IF NEW.value < 1 OR NEW.value > 5 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hodnota známky musí byť 1-5';
  END IF;
END//

DELIMITER ;

-- =========================================
-- TESTOVACIE DÁTA
-- =========================================

-- Roly
INSERT INTO roles (code, name) VALUES
('ADMIN', 'Administrátor'),
('TEACHER', 'Učiteľ'),
('STUDENT', 'Žiak');

-- Triedy: 1.A-1.C, 2.A-2.C, 3.A-3.C, 4.A-4.C (12 tried)
INSERT INTO classes (grade_year, name_letter) VALUES
(1,'A'),(1,'B'),(1,'C'),
(2,'A'),(2,'B'),(2,'C'),
(3,'A'),(3,'B'),(3,'C'),
(4,'A'),(4,'B'),(4,'C');

-- Predmety: 8
INSERT INTO subjects (name) VALUES
('Matematika'),
('Slovenský jazyk'),
('Anglický jazyk'),
('Informatika'),
('Dejepis'),
('Prírodoveda'),
('Hudobná výchova'),
('Telesná výchova');

-- Poznámka: password_hash je placeholder (neskôr spravíš reálne bcrypt)
SET @HASH := '$2b$10$testtesttesttesttesttesttesttesttesttest';

-- Admin (min. 1)
INSERT INTO users (username, password_hash, first_name, last_name, email, role_id, class_id) VALUES
('admin', @HASH, 'Admin', 'Skoly', 'admin@school.local', (SELECT id FROM roles WHERE code='ADMIN'), NULL);

-- Učitelia (min. 7) - dávam 12
INSERT INTO users (username, password_hash, first_name, last_name, email, role_id, class_id) VALUES
('t01', @HASH, 'Ján', 'Novák', 't01@school.local', (SELECT id FROM roles WHERE code='TEACHER'), NULL),
('t02', @HASH, 'Peter', 'Horváth', 't02@school.local', (SELECT id FROM roles WHERE code='TEACHER'), NULL),
('t03', @HASH, 'Mária', 'Kováčová', 't03@school.local', (SELECT id FROM roles WHERE code='TEACHER'), NULL),
('t04', @HASH, 'Zuzana', 'Vargová', 't04@school.local', (SELECT id FROM roles WHERE code='TEACHER'), NULL),
('t05', @HASH, 'Marek', 'Kováč', 't05@school.local', (SELECT id FROM roles WHERE code='TEACHER'), NULL),
('t06', @HASH, 'Lucia', 'Tóthová', 't06@school.local', (SELECT id FROM roles WHERE code='TEACHER'), NULL),
('t07', @HASH, 'Michal', 'Nagy', 't07@school.local', (SELECT id FROM roles WHERE code='TEACHER'), NULL),
('t08', @HASH, 'Eva', 'Urbanová', 't08@school.local', (SELECT id FROM roles WHERE code='TEACHER'), NULL),
('t09', @HASH, 'Tomáš', 'Benko', 't09@school.local', (SELECT id FROM roles WHERE code='TEACHER'), NULL),
('t10', @HASH, 'Anna', 'Králová', 't10@school.local', (SELECT id FROM roles WHERE code='TEACHER'), NULL),
('t11', @HASH, 'Roman', 'Blaho', 't11@school.local', (SELECT id FROM roles WHERE code='TEACHER'), NULL),
('t12', @HASH, 'Ivana', 'Molnárová', 't12@school.local', (SELECT id FROM roles WHERE code='TEACHER'), NULL);

-- Žiaci: 25 na triedu, spolu 300
-- usernames: s<rocnik><pismeno><01..25> napr s1a01, s4c25
WITH RECURSIVE nums AS (
  SELECT 1 n
  UNION ALL
  SELECT n+1 FROM nums WHERE n < 25
)
INSERT INTO users (username, password_hash, first_name, last_name, email, role_id, class_id)
SELECT
  CONCAT('s', c.grade_year, LOWER(c.name_letter), LPAD(n,2,'0')),
  @HASH,
  'Žiak',
  CONCAT(c.grade_year, c.name_letter, LPAD(n,2,'0')),
  CONCAT('s', c.grade_year, LOWER(c.name_letter), LPAD(n,2,'0'), '@school.local'),
  (SELECT id FROM roles WHERE code='STUDENT'),
  c.id
FROM classes c
JOIN nums;

-- Priradenie predmetov k triedam + učiteľov:
-- 12 tried x 8 predmetov = 96 riadkov
-- učitelia sa rotujú deterministicky, ale pre (trieda, predmet) je vždy len 1
INSERT INTO class_subjects (class_id, subject_id, teacher_id)
SELECT
  c.id,
  s.id,
  (
    SELECT u.id
    FROM users u
    WHERE u.role_id = (SELECT id FROM roles WHERE code='TEACHER')
    ORDER BY u.id
    LIMIT 1 OFFSET ((c.id + s.id) % 12)
  )
FROM classes c
JOIN subjects s;

-- Prihlásenie žiakov na všetky predmety svojej triedy (podmienka)
INSERT INTO enrollments (student_id, class_subject_id)
SELECT
  u.id AS student_id,
  cs.id AS class_subject_id
FROM users u
JOIN class_subjects cs ON cs.class_id = u.class_id
WHERE u.role_id = (SELECT id FROM roles WHERE code='STUDENT');

-- Ukážkové známky (pár kusov, aby tabuľka nebola prázdna)
-- vyberieme 3 enrollments z rôznych tried a vložíme známku učiteľom priradeným k class_subject
INSERT INTO grades (enrollment_id, teacher_id, value, graded_at, note)
SELECT e.id, cs.teacher_id, 1, NOW(), 'Test - písomka'
FROM enrollments e
JOIN class_subjects cs ON cs.id = e.class_subject_id
ORDER BY e.id
LIMIT 1;

INSERT INTO grades (enrollment_id, teacher_id, value, graded_at, note)
SELECT e.id, cs.teacher_id, 3, NOW(), 'Test - ústna odpoveď'
FROM enrollments e
JOIN class_subjects cs ON cs.id = e.class_subject_id
ORDER BY e.id
LIMIT 1 OFFSET 50;

INSERT INTO grades (enrollment_id, teacher_id, value, graded_at, note)
SELECT e.id, cs.teacher_id, 2, NOW(), 'Test - projekt'
FROM enrollments e
JOIN class_subjects cs ON cs.id = e.class_subject_id
ORDER BY e.id
LIMIT 1 OFFSET 120;
