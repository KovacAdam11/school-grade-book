SET NAMES utf8mb4;
SET time_zone = '+01:00';

-- =====================================================
-- DROP TABLES
-- =====================================================
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS class_subjects;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS roles;

-- =====================================================
-- TABLES
-- =====================================================
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grade_year INT NOT NULL,
  name_letter VARCHAR(5) NOT NULL,
  UNIQUE KEY uq_class (grade_year, name_letter)
) ENGINE=InnoDB;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  role_id INT NOT NULL,
  class_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (class_id) REFERENCES classes(id)
) ENGINE=InnoDB;

CREATE TABLE subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE class_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  subject_id INT NOT NULL,
  teacher_id INT NOT NULL,
  UNIQUE KEY uq_class_subject (class_id, subject_id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (subject_id) REFERENCES subjects(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  class_subject_id INT NOT NULL,
  UNIQUE KEY uq_enr (student_id, class_subject_id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (class_subject_id) REFERENCES class_subjects(id)
) ENGINE=InnoDB;

CREATE TABLE grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL,
  teacher_id INT NOT NULL,
  grade_value TINYINT NOT NULL,
  graded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  note VARCHAR(255),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  CONSTRAINT chk_grade CHECK (grade_value BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- =====================================================
-- TRIGGER – učiteľ môže hodnotiť len svoj predmet
-- =====================================================
DELIMITER //

CREATE TRIGGER trg_grades_before_insert
BEFORE INSERT ON grades
FOR EACH ROW
BEGIN
  DECLARE t INT;

  SELECT cs.teacher_id INTO t
  FROM enrollments e
  JOIN class_subjects cs ON cs.id = e.class_subject_id
  WHERE e.id = NEW.enrollment_id;

  IF t IS NULL OR t <> NEW.teacher_id THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Učiteľ nie je priradený k predmetu';
  END IF;
END//

DELIMITER ;

-- =====================================================
-- DATA
-- =====================================================

-- ROLES
INSERT INTO roles (code, name) VALUES
('ADMIN','Administrátor'),
('TEACHER','Učiteľ'),
('STUDENT','Žiak');

-- CLASSES
INSERT INTO classes (grade_year, name_letter) VALUES
(1,'A'),(1,'B'),(1,'C'),
(2,'A'),(2,'B'),(2,'C'),
(3,'A'),(3,'B'),(3,'C'),
(4,'A'),(4,'B'),(4,'C');

-- PASSWORD HASH (spoločný pre testovacie účty)
SET @HASH := '$2b$10$2c8aGVtJKMYzd5i296AbxOisitdFuGoEA9Z7R4s7g734Fzd/L31TG';

-- ADMIN
INSERT INTO users (username,password_hash,first_name,last_name,email,role_id)
VALUES ('admin',@HASH,'Admin','Skoly','admin@school.local',1);

INSERT INTO users (username,password_hash,first_name,last_name,email,role_id)
SELECT
  CONCAT('t', LPAD(n.n, 2, '0')),
  @HASH,

  -- KRSTNÉ MENO (permutované)
  CASE
    WHEN MOD(n.n, 2) = 1 THEN
      ELT(((n.n * 7) MOD 12) + 1,
        'Ján','Peter','Marek','Tomáš',
        'Michal','Roman','Andrej','Martin',
        'Filip','Lukáš','Daniel','Igor'
      )
    ELSE
      ELT(((n.n * 7) MOD 12) + 1,
        'Anna','Eva','Lucia','Petra',
        'Martina','Jana','Zuzana','Veronika',
        'Katarína','Monika','Simona','Lenka'
      )
  END,

  -- PRIEZVISKO (rovnaká permutácia → sedí rod)
  CASE
    WHEN MOD(n.n, 2) = 1 THEN
      ELT(((n.n * 7) MOD 12) + 1,
        'Novák','Kováč','Horváth','Varga',
        'Molnár','Tóth','Hudák','Polák',
        'Baláž','Šimko','Král','Urban'
      )
    ELSE
      ELT(((n.n * 7) MOD 12) + 1,
        'Nováková','Kováčová','Horváthová','Vargová',
        'Molnárová','Tóthová','Hudáková','Poláková',
        'Balážová','Šimková','Králová','Urbanová'
      )
  END,

  CONCAT('t', LPAD(n.n, 2, '0'), '@school.local'),
  (SELECT id FROM roles WHERE code='TEACHER')

FROM (
  SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
  UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
) n;

-- STUDENTS (10 na triedu) – nezávislé miešanie mien a priezvisk
INSERT INTO users (username,password_hash,first_name,last_name,email,role_id,class_id)
SELECT
  CONCAT('s', c.grade_year, LOWER(c.name_letter), LPAD(n.n,2,'0')),
  @HASH,

  /* KRSTNÉ MENO – index A */
  CASE
    WHEN MOD(n.n, 2) = 1 THEN
      ELT(((n.n * 5 + c.id * 7) MOD 12) + 1,
        'Adam','Peter','Martin','Tomáš',
        'Jakub','Marek','Lukáš','Filip',
        'Michal','Daniel','Samuel','Oliver'
      )
    ELSE
      ELT(((n.n * 5 + c.id * 7) MOD 12) + 1,
        'Anna','Eva','Lucia','Petra',
        'Martina','Jana','Zuzana','Veronika',
        'Katarína','Monika','Simona','Lenka'
      )
  END,

  /* PRIEZVISKO – index B (ÚMYSELNE INÝ) */
  CASE
    WHEN MOD(n.n, 2) = 1 THEN
      ELT(((n.n * 11 + c.id * 3) MOD 12) + 1,
        'Novák','Kováč','Horváth','Varga',
        'Molnár','Tóth','Hudák','Polák',
        'Baláž','Šimko','Král','Urban'
      )
    ELSE
      ELT(((n.n * 11 + c.id * 3) MOD 12) + 1,
        'Nováková','Kováčová','Horváthová','Vargová',
        'Molnárová','Tóthová','Hudáková','Poláková',
        'Balážová','Šimková','Králová','Urbanová'
      )
  END,

  CONCAT('s', c.grade_year, LOWER(c.name_letter), LPAD(n.n,2,'0'), '@school.local'),
  (SELECT id FROM roles WHERE code='STUDENT'),
  c.id

FROM classes c
JOIN (
  SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
) n;


-- SUBJECTS
INSERT INTO subjects (name) VALUES
('Matematika'),
('Slovenský jazyk'),
('Anglický jazyk'),
('Informatika'),
('Dejepis'),
('Prírodoveda'),
('Hudobná výchova'),
('Telesná výchova');

-- CLASS ↔ SUBJECT ↔ TEACHER
INSERT INTO class_subjects (class_id, subject_id, teacher_id)
SELECT
    c.id,
    s.id,
    (
        SELECT u.id
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS idx
            FROM users
            WHERE role_id = (SELECT id FROM roles WHERE code='TEACHER')
        ) u
        WHERE u.idx = (c.id + s.id) MOD 12
        LIMIT 1
    )
FROM classes c
JOIN subjects s;

-- ENROLLMENTS (žiak je na všetkých predmetoch svojej triedy)
INSERT INTO enrollments (student_id, class_subject_id)
SELECT
  u.id,
  cs.id
FROM users u
JOIN class_subjects cs ON cs.class_id = u.class_id
WHERE u.role_id = (SELECT id FROM roles WHERE code='STUDENT');
