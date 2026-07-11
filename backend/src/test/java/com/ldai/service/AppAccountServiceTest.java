package com.ldai.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class AppAccountServiceTest {
    private final AppAccountService service = new AppAccountService(mock(IAppUserService.class));

    @Test
    void temporaryPasswordHasRequiredLengthAndCharacterGroups() {
        for (int i = 0; i < 100; i++) {
            String password = service.generateTemporaryPassword();
            assertEquals(10, password.length());
            assertTrue(password.matches(".*[A-Z].*"));
            assertTrue(password.matches(".*[a-z].*"));
            assertTrue(password.matches(".*\\d.*"));
        }
    }

    @Test
    void acceptsPasswordWithLettersAndDigits() {
        assertDoesNotThrow(() -> service.validateNewPassword("Cloud2026"));
    }

    @Test
    void rejectsWeakOrOutOfRangePasswords() {
        assertThrows(AppAccountService.AccountException.class, () -> service.validateNewPassword("12345678"));
        assertThrows(AppAccountService.AccountException.class, () -> service.validateNewPassword("abcdefgh"));
        assertThrows(AppAccountService.AccountException.class, () -> service.validateNewPassword("A1short"));
        assertThrows(AppAccountService.AccountException.class, () -> service.validateNewPassword("A1" + "x".repeat(31)));
    }
}
