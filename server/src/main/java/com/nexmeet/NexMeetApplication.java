package com.nexmeet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableTransactionManagement
public class NexMeetApplication {

	public static void main(String[] args) {
		SpringApplication.run(NexMeetApplication.class, args);

		System.out.println("NexMeet Application Started");
	}

}
