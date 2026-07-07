package com.ldai;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@MapperScan("com.ldai.mapper")
@EnableScheduling
public class LdAiApplication {

    public static void main(String[] args) {
        SpringApplication.run(LdAiApplication.class, args);
    }

}
