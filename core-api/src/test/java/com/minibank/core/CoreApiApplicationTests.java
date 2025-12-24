package com.minibank.core;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class CoreApiApplicationTests {

	@Test
	void contextLoads() {
	}
	@Test
	void jacksonIsOnClasspath() {
		var mapper = tools.jackson.databind.json.JsonMapper.builder().build();
		assert mapper != null;
}

}

