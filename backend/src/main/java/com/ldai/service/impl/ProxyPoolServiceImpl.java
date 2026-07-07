package com.ldai.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.ldai.entity.ApiMerchant;
import com.ldai.entity.Device;
import com.ldai.entity.ProxyPool;
import com.ldai.entity.ProxyUsageLog;
import com.ldai.mapper.DeviceMapper;
import com.ldai.mapper.ProxyPoolMapper;
import com.ldai.mapper.ProxyUsageLogMapper;
import com.ldai.service.IApiMerchantService;
import com.ldai.service.IProxyPoolService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ProxyPoolServiceImpl extends ServiceImpl<ProxyPoolMapper, ProxyPool> implements IProxyPoolService {

    @Autowired
    private DeviceMapper deviceMapper;

    @Autowired
    private ProxyUsageLogMapper proxyUsageLogMapper;

    @Autowired
    private IApiMerchantService apiMerchantService;

    @Override
    @Transactional
    public Map<String, Object> syncFromDevices() {
        LambdaQueryWrapper<Device> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Device::getType, 2)
                .isNotNull(Device::getIp)
                .ne(Device::getIp, "");

        List<Device> devices = deviceMapper.selectList(wrapper).stream()
                .filter(device -> isValidPublicIp(device.getIp()))
                .collect(Collectors.toList());

        Map<String, List<Device>> ipGroups = devices.stream()
                .collect(Collectors.groupingBy(Device::getIp, LinkedHashMap::new, Collectors.toList()));

        List<ProxyPool> existingPools = list();
        Map<String, ProxyPool> existingByIp = existingPools.stream()
                .filter(pool -> pool.getProxyIp() != null)
                .collect(Collectors.toMap(ProxyPool::getProxyIp, pool -> pool, (a, b) -> a));

        int created = 0;
        int updated = 0;
        LocalDateTime now = LocalDateTime.now();

        for (Map.Entry<String, List<Device>> entry : ipGroups.entrySet()) {
            String ip = entry.getKey();
            List<Device> group = entry.getValue();
            Device representative = chooseRepresentativeDevice(group);
            boolean hasOnlineDevice = group.stream().anyMatch(device -> Objects.equals(device.getStatus(), 1));

            ProxyPool pool = existingByIp.get(ip);
            boolean isNew = pool == null;
            boolean shouldClearAllocation = false;
            if (isNew) {
                pool = new ProxyPool();
                pool.setProxyIp(ip);
                pool.setProtocol("socks5");
                pool.setProxyPort(0);
                pool.setTotalBytes(0L);
                pool.setCreateTime(now);
            }

            LocationParts locationParts = parseLocation(representative.getLocation());
            pool.setDeviceId(representative.getId());
            pool.setDeviceSn(representative.getSn());
            pool.setLocation(representative.getLocation());
            pool.setCarrier(representative.getCarrier());
            pool.setProvince(locationParts.province());
            pool.setCity(locationParts.city());
            pool.setDeviceCount(group.size());
            pool.setLastSyncTime(now);
            pool.setUpdateTime(now);

            if (!hasOnlineDevice) {
                pool.setStatus(0);
                shouldClearAllocation = true;
            } else if (pool.getStatus() == null || pool.getStatus() == 0) {
                pool.setStatus(1);
            } else if (Objects.equals(pool.getStatus(), 2)
                    && pool.getExpireAt() != null
                    && pool.getExpireAt().isBefore(now)) {
                pool.setStatus(1);
                shouldClearAllocation = true;
            }

            if (isNew) {
                save(pool);
                created++;
            } else {
                updateById(pool);
                updated++;
            }

            if (shouldClearAllocation && pool.getId() != null) {
                lambdaUpdate()
                        .eq(ProxyPool::getId, pool.getId())
                        .set(ProxyPool::getAllocatedTo, null)
                        .set(ProxyPool::getAllocatedAt, null)
                        .set(ProxyPool::getExpireAt, null)
                        .update();
            }
        }

        int offline = 0;
        for (ProxyPool pool : existingPools) {
            if (pool.getProxyIp() == null || ipGroups.containsKey(pool.getProxyIp())) {
                continue;
            }
            boolean changed = lambdaUpdate()
                    .eq(ProxyPool::getId, pool.getId())
                    .set(ProxyPool::getStatus, 0)
                    .set(ProxyPool::getAllocatedTo, null)
                    .set(ProxyPool::getAllocatedAt, null)
                    .set(ProxyPool::getExpireAt, null)
                    .set(ProxyPool::getLastSyncTime, now)
                    .update();
            if (changed) {
                offline++;
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("deviceCount", devices.size());
        result.put("uniqueIpCount", ipGroups.size());
        result.put("created", created);
        result.put("updated", updated);
        result.put("offline", offline);
        result.put("syncTime", now);
        return result;
    }

    @Override
    public Map<String, Object> getPoolStats() {
        List<ProxyPool> pools = list();
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalIps", pools.size());
        stats.put("availableIps", countByStatus(pools, 1));
        stats.put("allocatedIps", countByStatus(pools, 2));
        stats.put("offlineIps", countByStatus(pools, 0));
        stats.put("maintenanceIps", countByStatus(pools, 3));
        stats.put("totalDevices", pools.stream()
                .mapToInt(pool -> pool.getDeviceCount() == null ? 0 : pool.getDeviceCount())
                .sum());

        List<Map<String, Object>> provinceStats = pools.stream()
                .collect(Collectors.groupingBy(
                        pool -> emptyToUnknown(pool.getProvince()),
                        LinkedHashMap::new,
                        Collectors.toList()))
                .entrySet()
                .stream()
                .map(entry -> {
                    List<ProxyPool> group = entry.getValue();
                    Map<String, Object> item = new HashMap<>();
                    item.put("province", entry.getKey());
                    item.put("totalIps", group.size());
                    item.put("availableIps", countByStatus(group, 1));
                    item.put("allocatedIps", countByStatus(group, 2));
                    item.put("offlineIps", countByStatus(group, 0));
                    item.put("deviceCount", group.stream()
                            .mapToInt(pool -> pool.getDeviceCount() == null ? 0 : pool.getDeviceCount())
                            .sum());
                    return item;
                })
                .sorted((a, b) -> Integer.compare((Integer) b.get("totalIps"), (Integer) a.get("totalIps")))
                .collect(Collectors.toList());
        stats.put("provinceStats", provinceStats);

        List<Map<String, Object>> carrierStats = pools.stream()
                .collect(Collectors.groupingBy(
                        pool -> emptyToUnknown(pool.getCarrier()),
                        LinkedHashMap::new,
                        Collectors.toList()))
                .entrySet()
                .stream()
                .map(entry -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("carrier", entry.getKey());
                    item.put("totalIps", entry.getValue().size());
                    item.put("availableIps", countByStatus(entry.getValue(), 1));
                    return item;
                })
                .collect(Collectors.toList());
        stats.put("carrierStats", carrierStats);

        return stats;
    }

    @Override
    @Transactional
    public List<ProxyPool> obtainProxies(String province, String carrier, int count,
                                         Long merchantId, int durationMinutes) {
        int safeCount = Math.min(Math.max(count, 1), 200);
        int safeDuration = Math.min(Math.max(durationMinutes, 1), 60 * 24 * 30);

        LambdaQueryWrapper<ProxyPool> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ProxyPool::getStatus, 1);
        if (province != null && !province.trim().isEmpty()) {
            String keyword = province.trim();
            wrapper.and(w -> w.like(ProxyPool::getProvince, keyword)
                    .or()
                    .like(ProxyPool::getLocation, keyword));
        }
        if (carrier != null && !carrier.trim().isEmpty()) {
            wrapper.eq(ProxyPool::getCarrier, carrier.trim());
        }
        wrapper.orderByDesc(ProxyPool::getDeviceCount)
                .orderByDesc(ProxyPool::getLastSyncTime)
                .last("LIMIT " + safeCount);

        List<ProxyPool> proxies = list(wrapper);
        LocalDateTime now = LocalDateTime.now();
        ApiMerchant merchant = merchantId == null ? null : apiMerchantService.getById(merchantId);

        for (ProxyPool proxy : proxies) {
            boolean updated = lambdaUpdate()
                    .eq(ProxyPool::getId, proxy.getId())
                    .eq(ProxyPool::getStatus, 1)
                    .set(ProxyPool::getStatus, 2)
                    .set(ProxyPool::getAllocatedTo, merchantId)
                    .set(ProxyPool::getAllocatedAt, now)
                    .set(ProxyPool::getExpireAt, now.plusMinutes(safeDuration))
                    .update();
            if (updated) {
                proxy.setStatus(2);
                proxy.setAllocatedTo(merchantId);
                proxy.setAllocatedAt(now);
                proxy.setExpireAt(now.plusMinutes(safeDuration));
                writeUsageLog(proxy, merchant, "allocate", "分配代理 " + safeDuration + " 分钟");
            }
        }

        return proxies.stream()
                .filter(proxy -> Objects.equals(proxy.getStatus(), 2))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ProxyPool allocateProxy(Long proxyId, Long merchantId, int durationMinutes) {
        if (proxyId == null || merchantId == null) {
            return null;
        }
        int safeDuration = Math.min(Math.max(durationMinutes, 1), 60 * 24 * 30);
        ProxyPool proxy = getById(proxyId);
        if (proxy == null || !Objects.equals(proxy.getStatus(), 1)) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        boolean updated = lambdaUpdate()
                .eq(ProxyPool::getId, proxyId)
                .eq(ProxyPool::getStatus, 1)
                .set(ProxyPool::getStatus, 2)
                .set(ProxyPool::getAllocatedTo, merchantId)
                .set(ProxyPool::getAllocatedAt, now)
                .set(ProxyPool::getExpireAt, now.plusMinutes(safeDuration))
                .update();
        if (!updated) {
            return null;
        }

        ApiMerchant merchant = apiMerchantService.getById(merchantId);
        proxy.setStatus(2);
        proxy.setAllocatedTo(merchantId);
        proxy.setAllocatedAt(now);
        proxy.setExpireAt(now.plusMinutes(safeDuration));
        writeUsageLog(proxy, merchant, "allocate", "指定分配代理 " + safeDuration + " 分钟");
        return proxy;
    }

    @Override
    @Transactional
    public boolean releaseProxy(Long proxyId) {
        ProxyPool proxy = getById(proxyId);
        if (proxy == null) {
            return false;
        }

        ApiMerchant merchant = proxy.getAllocatedTo() == null ? null : apiMerchantService.getById(proxy.getAllocatedTo());
        boolean released = lambdaUpdate()
                .eq(ProxyPool::getId, proxyId)
                .set(ProxyPool::getStatus, 1)
                .set(ProxyPool::getAllocatedTo, null)
                .set(ProxyPool::getAllocatedAt, null)
                .set(ProxyPool::getExpireAt, null)
                .update();
        if (released) {
            writeUsageLog(proxy, merchant, "release", "手动释放代理");
        }
        return released;
    }

    @Override
    @Transactional
    public int releaseByMerchant(Long merchantId) {
        if (merchantId == null) {
            return 0;
        }
        List<ProxyPool> proxies = lambdaQuery()
                .eq(ProxyPool::getAllocatedTo, merchantId)
                .eq(ProxyPool::getStatus, 2)
                .list();
        int count = 0;
        for (ProxyPool proxy : proxies) {
            if (releaseProxy(proxy.getId())) {
                count++;
            }
        }
        return count;
    }

    @Override
    @Transactional
    public int releaseExpiredProxies() {
        LocalDateTime now = LocalDateTime.now();
        List<ProxyPool> expired = lambdaQuery()
                .eq(ProxyPool::getStatus, 2)
                .isNotNull(ProxyPool::getExpireAt)
                .lt(ProxyPool::getExpireAt, now)
                .list();
        int count = 0;
        for (ProxyPool proxy : expired) {
            ApiMerchant merchant = proxy.getAllocatedTo() == null ? null : apiMerchantService.getById(proxy.getAllocatedTo());
            boolean released = lambdaUpdate()
                    .eq(ProxyPool::getId, proxy.getId())
                    .set(ProxyPool::getStatus, 1)
                    .set(ProxyPool::getAllocatedTo, null)
                    .set(ProxyPool::getAllocatedAt, null)
                    .set(ProxyPool::getExpireAt, null)
                    .update();
            if (released) {
                writeUsageLog(proxy, merchant, "expire", "到期自动释放代理");
                count++;
            }
        }
        return count;
    }

    private Device chooseRepresentativeDevice(List<Device> devices) {
        return devices.stream()
                .sorted(Comparator
                        .comparing((Device device) -> Objects.equals(device.getStatus(), 1) ? 0 : 1)
                        .thenComparing(Device::getLastHeartbeatTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .findFirst()
                .orElse(devices.get(0));
    }

    private long countByStatus(List<ProxyPool> pools, int status) {
        return pools.stream()
                .filter(pool -> Objects.equals(pool.getStatus(), status))
                .count();
    }

    private void writeUsageLog(ProxyPool proxy, ApiMerchant merchant, String action, String remark) {
        ProxyUsageLog log = new ProxyUsageLog();
        log.setProxyId(proxy.getId());
        log.setProxyIp(proxy.getProxyIp());
        log.setMerchantId(merchant == null ? proxy.getAllocatedTo() : merchant.getId());
        log.setMerchantName(merchant == null ? null : merchant.getMerchantName());
        log.setAction(action);
        log.setBytesUp(0L);
        log.setBytesDown(0L);
        log.setRemark(remark);
        log.setCreateTime(LocalDateTime.now());
        proxyUsageLogMapper.insert(log);
    }

    private boolean isValidPublicIp(String ip) {
        if (ip == null || ip.trim().isEmpty()) {
            return false;
        }
        String value = ip.trim();
        return !value.startsWith("10.")
                && !value.startsWith("192.168.")
                && !value.startsWith("172.16.")
                && !value.startsWith("127.")
                && !"0.0.0.0".equals(value);
    }

    private LocationParts parseLocation(String location) {
        if (location == null || location.trim().isEmpty()) {
            return new LocationParts("未知地区", "");
        }
        String loc = location.trim();
        List<String> directCities = new ArrayList<>();
        directCities.add("北京市");
        directCities.add("上海市");
        directCities.add("天津市");
        directCities.add("重庆市");
        for (String city : directCities) {
            if (loc.startsWith(city)) {
                return new LocationParts(city, loc.substring(city.length()));
            }
        }
        int provinceIndex = loc.indexOf("省");
        if (provinceIndex > 0) {
            String province = loc.substring(0, provinceIndex + 1);
            String city = loc.substring(provinceIndex + 1);
            return new LocationParts(province, city);
        }
        int regionIndex = loc.indexOf("自治区");
        if (regionIndex > 0) {
            String province = loc.substring(0, regionIndex + 3);
            String city = loc.substring(regionIndex + 3);
            return new LocationParts(province, city);
        }
        return new LocationParts(loc, "");
    }

    private String emptyToUnknown(String value) {
        return value == null || value.trim().isEmpty() ? "未知" : value;
    }

    private record LocationParts(String province, String city) {
    }
}
