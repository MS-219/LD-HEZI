package com.ldai.task;

import com.ldai.service.impl.ProxyPoolServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ProxyPoolTask {

    @Autowired
    private ProxyPoolServiceImpl proxyPoolService;

    @Scheduled(fixedRate = 60000)
    public void releaseExpiredProxies() {
        proxyPoolService.releaseExpiredProxies();
    }
}
