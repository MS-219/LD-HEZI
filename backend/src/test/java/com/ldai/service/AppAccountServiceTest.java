package com.ldai.service;

import com.ldai.entity.AppUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AppAccountServiceTest {
    private IAppUserService appUserService;
    private AppAccountService service;

    @BeforeEach
    void setUp() {
        appUserService = mock(IAppUserService.class);
        service = new AppAccountService(appUserService);
    }

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

    @Test
    void allowsSmsCodeForUnknownPhone() {
        when(appUserService.getByPhone("17816099666")).thenReturn(null);
        assertDoesNotThrow(() -> service.assertSmsLoginAvailable("17816099666"));
    }

    @Test
    void allowsSmsCodeForEnabledAccount() {
        AppUser user = enabledUser("17816099666");
        when(appUserService.getByPhone(user.getPhone())).thenReturn(user);
        assertDoesNotThrow(() -> service.assertSmsLoginAvailable(user.getPhone()));
    }

    @Test
    void blocksSmsCodeForDisabledAccount() {
        AppUser user = enabledUser("17816099666");
        user.setAccountEnabled(false);
        when(appUserService.getByPhone(user.getPhone())).thenReturn(user);

        AppAccountService.AccountException error = assertThrows(
                AppAccountService.AccountException.class,
                () -> service.assertSmsLoginAvailable(user.getPhone()));
        assertEquals("账号已停用，请联系管理员", error.getMessage());
    }

    @Test
    void smsLoginCreatesAndLogsInUnknownPhone() {
        String phone = "17816099666";
        when(appUserService.getByPhone(phone)).thenReturn(null);
        when(appUserService.save(any(AppUser.class))).thenReturn(true);
        when(appUserService.updateById(any(AppUser.class))).thenReturn(true);

        Map<String, Object> result = service.smsLogin(phone);

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserService).save(captor.capture());
        AppUser created = captor.getValue();
        assertEquals(phone, created.getPhone());
        assertEquals("用户9666", created.getNickname());
        assertTrue(Boolean.TRUE.equals(created.getAccountEnabled()));
        assertFalse(Boolean.TRUE.equals(created.getMustChangePassword()));
        assertNull(created.getPasswordHash());
        assertEquals(phone, result.get("phone"));
        assertEquals("用户9666", result.get("nickname"));
        assertEquals(false, result.get("mustChangePassword"));
        assertNotNull(result.get("token"));
        verify(appUserService).updateById(created);
    }

    @Test
    void smsLoginUsesExistingEnabledAccountWithoutCreatingAnother() {
        AppUser user = enabledUser("17816099666");
        when(appUserService.getByPhone(user.getPhone())).thenReturn(user);
        when(appUserService.updateById(any(AppUser.class))).thenReturn(true);

        Map<String, Object> result = service.smsLogin(user.getPhone());

        assertEquals(user.getId(), result.get("userId"));
        verify(appUserService, never()).save(any(AppUser.class));
        verify(appUserService).updateById(user);
    }

    @Test
    void smsLoginBlocksDisabledAccount() {
        AppUser user = enabledUser("17816099666");
        user.setAccountEnabled(false);
        when(appUserService.getByPhone(user.getPhone())).thenReturn(user);

        AppAccountService.AccountException error = assertThrows(
                AppAccountService.AccountException.class,
                () -> service.smsLogin(user.getPhone()));
        assertEquals("账号已停用，请联系管理员", error.getMessage());
        verify(appUserService, never()).save(any(AppUser.class));
        verify(appUserService, never()).updateById(any(AppUser.class));
    }

    private AppUser enabledUser(String phone) {
        AppUser user = new AppUser();
        user.setId(123456L);
        user.setOpenid("account_test");
        user.setPhone(phone);
        user.setNickname("测试用户");
        user.setLevel(0);
        user.setAccountEnabled(true);
        user.setMustChangePassword(false);
        return user;
    }
}
